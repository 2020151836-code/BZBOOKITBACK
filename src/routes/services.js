import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/services - Get all available services
router.get('/', async (req, res) => {
  try {
    // Use the correct table name 'service'
    // Select 'serviceid' and alias it as 'id' for a consistent API response
    const { data, error } = await supabase.from('service')
      .select('id:serviceid, name, price');

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;