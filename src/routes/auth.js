import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { protect } from './authMiddleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Authenticate user with Supabase
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const supabaseUser = sessionData.user;

    // 2. Fetch full user metadata (admin requires service key)
    const { data: userRecord, error: userError } = await supabaseAdmin.auth.admin.getUserById(supabaseUser.id);
    if (userError || !userRecord.user) {
      console.error('Failed to retrieve user metadata with admin client:', userError);
      return res.status(500).json({ message: 'Failed to retrieve user metadata.' });
    }

    const userMeta = userRecord.user;
    const appRole = userMeta.app_metadata?.role || 'client'; // Read role from app_metadata

    // 3. If business owner, fetch business ID
    let businessId = null;
    if (appRole === 'business_owner') {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', supabaseUser.id)
        .single();
      businessId = businessData?.id || null;
    }

    // 4. Return structured login response
    res.json({
      id: supabaseUser.id,
      email: supabaseUser.email,
      role: appRole,
      businessId,
      token: sessionData.session.access_token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// POST /api/auth/signup - Create a new user
router.post('/signup', async (req, res) => {
  const { email, password, name = '', role = 'client' } = req.body; // role can be 'client' or 'business_owner'

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // The role for a new user is determined by the 'role' in the request body.
    // The frontend should provide 'business_owner' for business signups.
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role, // This sets the role in app_metadata
        },
      },
    });

    if (signUpError) {
      return res.status(400).json({ message: signUpError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ message: 'User not returned after signup.' });
    }

    // If a business owner signs up, create a corresponding 'businesses' entry.
    if (role === 'business_owner') {
      const { error: businessError } = await supabase.from('businesses').insert({
        owner_id: authData.user.id,
        name: `${name}'s Business`, // A default business name
        email: authData.user.email,
      });

      if (businessError) {
        console.error('CRITICAL: Failed to create business profile for new user:', businessError);
        // This is a critical error. The user exists in Auth but not in the 'businesses' table.
        // Inform the user to contact support for manual correction.
        return res.status(500).json({
          message: 'User account created, but failed to set up business profile. Please contact support.',
        });
      }
    }

    // By default, Supabase requires email confirmation.
    res.status(201).json({ message: 'Account created successfully! Please check your email to confirm your account.' });
  } catch (error) {
    console.error('Internal server error during signup:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// GET /api/auth/me - Get the current authenticated user
router.get('/me', protect, async (req, res) => {
  // The 'protect' middleware has already verified the token and attached the user object to req.user
  try {
    const user = req.user;
    const userRole = user.app_metadata.role || 'client'; // Correctly read role from app_metadata
    let businessId = null;
    // If the user is a business owner, fetch their associated businessId
    if (userRole === 'business_owner') {
      const { data: businessData, error } = await supabase
        .from('businesses') // Use the correct 'businesses' table
        .select('id')
        .eq('owner_id', user.id) // Query by the user's ID
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'single row not found' error
        console.error('Error fetching businessId for business_owner:', error);
      }
      if (businessData) {
        businessId = businessData.id;
      }
    }

    // Return a clean, consistent user object for the frontend
    res.status(200).json({ id: user.id, email: user.email, role: userRole, businessId });
  } catch (error) {
    console.error('Server error in /me route:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;