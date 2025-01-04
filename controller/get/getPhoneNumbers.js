require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function getDataPhoneNumbers() {
    try {
        const baseUrl = process.env.API_BASE_URL;
        const url = `${baseUrl}/api/v1/chatbot/number`;

        const token = process.env.API_TOKEN; // Fetch token from environment variables

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data; // Return the fetched data
    } catch (error) {
        console.error('Error fetching phone numbers:', error.message);
        throw new Error('Failed to fetch phone numbers');
    }
}

module.exports = { getDataPhoneNumbers };
