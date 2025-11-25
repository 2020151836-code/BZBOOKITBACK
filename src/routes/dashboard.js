import express from 'express';
import { supabase } from '../config/supabase.js';
import { protect } from './authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/business - Business Owner Dashboard
router.get('/business', protect, async (req, res) => {
  const user = req.user;

  if (user.app_metadata.role !== 'business_owner') {
    return res.status(403).json({ message: 'Forbidden: Access is restricted to business owners.' });
  }

  try {
    // Find business ID associated with this owner
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      console.error('Dashboard Error: Could not find business for owner ID:', user.id, businessError);
      return res.status(404).json({ message: 'Could not find an associated business for this user.' });
    }

    const businessId = businessData.id;

    // Fetch dashboard metrics
    const [appointmentsResult, revenueResult, upcomingResult] = await Promise.all([
      supabase.from('appointment').select('apptid', { count: 'exact', head: true }).eq('businessid', businessId),
      supabase.from('appointment').select('service:serviceid(price)').eq('businesid', businessId).eq('status', 'Completed'),
      supabase.from('appointment')
        .select('apptid, date, time, status, client:clientid(name), service:serviceid(name)')
        .eq('businessid', businessId)
        .eq('status', 'Confirmed')
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5),
    ]);

    const totalAppointments = appointmentsResult.count || 0;
    const upcomingAppointments = upcomingResult.data || [];
    const totalRevenue = (revenueResult.data || []).reduce((sum, app) => {
      return sum + (app.service?.price ? Number(app.service.price) : 0);
    }, 0);

    res.status(200).json({
      totalAppointments,
      totalRevenue,
      upcomingAppointments,
    });
  } catch (error) {
    console.error('Error fetching business dashboard data:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;
