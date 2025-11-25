import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { protect } from './authMiddleware.js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/appointments - Create a new appointment
// This route is now protected, so only authenticated users can create an appointment.
router.post('/', protect, async (req, res) => {
  const userId = req.user.id;

  // Log the incoming request body to the console
  console.log('Received appointment request body:', req.body);

  // Get appointment details from the request body
  const { serviceId, businessId, appointmentDate, notes } = req.body;

  if (!serviceId || !businessId || !appointmentDate) {
    return res.status(400).json({ message: 'Missing required appointment details (service, owner, date).' });
  }

  try {
    // --- "Just-in-Time" Profile Creation ---
    // Before creating the appointment, ensure a client profile exists for the user.
    // .upsert() will create a new row if one with the clientid doesn't exist,
    // or do nothing if it already exists.
    const { error: profileError } = await supabase
      .from('client')
      .upsert({ 
        clientid: userId, 
        email: req.user.email,
        name: req.user.user_metadata.name || 'New User' // Use name from metadata if available
      }, { onConflict: 'clientid' }); // This tells upsert to check for conflicts on the clientid column

    if (profileError) {
      console.error('Supabase error ensuring client profile exists:', profileError);
      return res.status(500).json({ message: 'Failed to ensure user profile exists before booking.' });
    }

    const { data, error } = await supabase // Use the global admin client
      .from('appointment') // Corrected table name to singular
      .insert({
        // Map the incoming data to the correct database column names
        clientid: userId,      // The logged-in user's ID maps to clientid
        serviceid: serviceId,
        business_id: businessId, // This was missing
        // staffid: businessId,   // We will leave this out for now since it's optional
        date: new Date(appointmentDate).toISOString().split('T')[0], // Extracts 'YYYY-MM-DD'
        time: new Date(appointmentDate).toTimeString().split(' ')[0], // Extracts 'HH:MM:SS'
        notes,
        status: 'Confirmed', // Default status, capitalized to match check constraint
      })
      .select() // Return the created appointment
      .single() // Expect a single object back
      
    if (error) {
      console.error('Supabase error creating appointment:', error);
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json(data); // Send back the newly created appointment
  } catch (error) {
    console.error('Internal server error in POST /api/appointments:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// GET /api/appointments/me - Get all appointments for the logged-in user
router.get('/me', protect, async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch all appointments where the user_id matches the current user
    const { data, error } = await supabase
      .from('appointment')
      .select(`
        apptid,
        date,
        time,
        notes,
        status,
        service:service!inner(name, price, businesses!inner(name))
      `)
      .eq('clientid', userId); // FIX: The column is 'clientid', not 'user_id'

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Internal server error in GET /api/appointments/me:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// PATCH /api/appointments/:id - Update/Modify an existing appointment
router.patch('/:id', protect, async (req, res) => {
  const userId = req.user.id;
  const appointmentId = req.params.id;
  const { appointmentDate, notes } = req.body;

  // Basic validation: check if there's at least something to update
  if (!appointmentDate && !notes) {
    return res.status(400).json({ message: 'No fields to update provided.' });
  }

  try {
    // 1. Verify the appointment belongs to the user before updating
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointment')
      .select('clientid')
      .eq('apptid', appointmentId)
      .single();

    if (fetchError || !existingAppointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (existingAppointment.clientid !== userId) {
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    }

    // 2. Prepare the update object
    const updateData = {};
    if (appointmentDate) {
      const newDate = new Date(appointmentDate);
      updateData.date = newDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      updateData.time = newDate.toTimeString().split(' ')[0]; // 'HH:MM:SS'
    }
    if (notes) {
      updateData.notes = notes;
    }

    // 3. Perform the update
    const { data, error } = await supabase
      .from('appointment')
      .update(updateData)
      .eq('apptid', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating appointment:', error);
      return res.status(400).json({ message: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Internal server error in PATCH /api/appointments/:id:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// DELETE /api/appointments/:id - Cancel an appointment
router.delete('/:id', protect, async (req, res) => {
  const user = req.user;
  const appointmentId = req.params.id;
  const { cancellationReason } = req.body; // Extract cancellation reason from the body

  try {
    // 1. Fetch the appointment to verify ownership
    const { data: appointment, error: fetchError } = await supabase
      .from('appointment')
      .select('clientid, business_id')
      .eq('apptid', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    let isAuthorized = false;
    // 2. Check if the user is the client who booked
    if (appointment.clientid === user.id) {
      isAuthorized = true;
    } 
    // 3. If not the client, check if they are the business owner
    else if (user.app_metadata.role === 'business_owner') {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id', { count: 'exact' })
        .eq('owner_id', user.id)
        .eq('id', appointment.business_id);
      
      if (business && business.length > 0 && !businessError) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to cancel this appointment.' });
    }

    // 4. Perform the update (soft delete)
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointment')
      .update({ status: 'Cancelled', cancellation_reason: cancellationReason })
      .eq('apptid', appointmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error('Internal server error in DELETE /api/appointments/:id:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;