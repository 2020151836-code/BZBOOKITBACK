
import express from 'express';
import cors from 'cors';

const app = express();

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Allow only your frontend to make requests
  credentials: true, // Allow cookies and authorization headers
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(express.json());

import appointmentRoutes from './src/routes/appointments.js';
import serviceRoutes from './src/routes/services.js';
import authRoutes from './src/routes/auth.js';
import dashboardRoutes from './src/routes/dashboard.js';
import businessRoutes from './src/routes/businesses.js'; // Import the new router
import notificationRoutes from './src/routes/notifications.js'; // Import the new router
import aiRoutes from './src/routes/ai.js'; // Import the AI router
import chatRoutes from './src/routes/chat.js'; // Import the new chat router
import { protect } from './src/routes/authMiddleware.js';

app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes); // Use the new router
app.use('/api/notifications', notificationRoutes); // Use the new router
app.use('/api/ai', aiRoutes); // Use the AI router
app.use('/api/chat', chatRoutes); // Use the new chat router
app.use('/api/dashboard', protect, dashboardRoutes); // <-- Added protect middleware

app.get('/', (req,res)=>res.send('BZBookit Backend Running'));

app.listen(5000, ()=>console.log("Server running on 5000"));
