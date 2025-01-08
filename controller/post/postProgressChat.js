require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function postProgressChat(nomorhp, service, status, res) {
  try {
      const baseUrl = process.env.API_BASE_URL;
      const url = `${baseUrl}/api/v1/chatbot/chat-progress`; 

      const token = process.env.API_TOKEN; // Fetch API token from environment variables

      const response = await axios.post(url, 
        { 
            phone: nomorhp, 
            service: service, 
            status: status 
        },
      {   
          headers: {
              'Authorization': `Bearer ${token}`, // Bearer token for authentication
              'Content-Type': 'application/json', // JSON content type
          },
      });

      console.log('Progress Chat saved successfully:', response.data);
      if (!res.headersSent) {
          res.status(200).json(response.data); // Respond with success data
      }
  } catch (error) {
      console.error('Error saving Progress Chat:', error.message);
      if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to save Progress Chat', error: error.message });
      }
  }
}

module.exports = { postProgressChat };
