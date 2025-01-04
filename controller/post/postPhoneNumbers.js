require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function postDataPhoneNumbers(nomorhp, res) {
  try {
      const baseUrl = process.env.API_BASE_URL;
      const url = `${baseUrl}/api/v1/chatbot/number/store`; // API endpoint for saving phone number

      const token = process.env.API_TOKEN; // Fetch API token from environment variables

      // const requestBody = {
      //     phone: nomorhp, // Phone number to be saved
      // };
      console.log(nomorhp)
      const response = await axios.post(url, 
        {
          "phone" : `${nomorhp}`
        },
      {
          headers: {
              'Authorization': `Bearer ${token}`, // Bearer token for authentication
              'Content-Type': 'application/json', // JSON content type
          },
      });

      console.log('Phone number saved successfully:', response.data);
      if (!res.headersSent) {
          res.status(200).json(response.data); // Respond with success data
      }
  } catch (error) {
      console.error('Error saving phone number:', error.message);
      if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to save phone number', error: error.message });
      }
  }
}

module.exports = { postDataPhoneNumbers };
