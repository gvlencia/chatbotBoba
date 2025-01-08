require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function updateProgressChat(nomorhp, service, status, res) {
    try {
      // Validate inputs
    //   validateInputs(nomorhp, service, status);
  
      const baseUrl = process.env.API_BASE_URL;
      const token = process.env.API_TOKEN;
      const url = `${baseUrl}/api/v1/chatbot/chat-progress/update`;
  
      console.log('Request Data:', { phone: nomorhp, service, status });
  
      const response = await axios.put(
        url,
        { 
            phone: nomorhp, 
            service: `${service}`, 
            status: status 
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      console.log('Progress Chat saved successfully:', response.data);
      if (res && !res.headersSent) {
        return res.status(200).json(response.data);
      }
    } catch (error) {
      console.error('Error saving Progress Chat:', error.response?.data || error.message);
  
      if (res && !res.headersSent) {
        return res.status(500).json({
          message: 'Failed to save Progress Chat',
          error: error.response?.data || error.message,
        });
      }
    }
  }
  

module.exports = { updateProgressChat };
