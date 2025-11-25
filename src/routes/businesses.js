import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /api/businesses - Get all available businesses
router.get('/', async (req, res) => {
  try {
    // Fetch all businesses from the correct 'businesses' table.
    const { data, error } = await supabase.from('businesses').select('id, name');

    // Log what we get from Supabase
    console.log('Fetched businesses data:', data);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;