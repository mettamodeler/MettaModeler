import express from 'express';
import axios from 'axios';

const router = express.Router();
const SIMULATION_SERVICE_URL = process.env.SIMULATION_SERVICE_URL || 'http://localhost:5000';

router.post('/simulate', async (req, res) => {
  try {
    console.log('Received simulation request:', JSON.stringify(req.body, null, 2));
    const response = await axios.post(`${SIMULATION_SERVICE_URL}/simulate`, req.body);
    console.log('Simulation response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Simulation error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Simulation failed' });
  }
}); 