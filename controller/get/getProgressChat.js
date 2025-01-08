require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function getProgressChat(nomorhp) {
    try {
        const baseUrl = process.env.API_BASE_URL; // Ensure this is set in your .env file
        const token = process.env.API_TOKEN; // Ensure this is set in your .env file

        if (!baseUrl || !token) {
            throw new Error('API_BASE_URL or API_TOKEN is not set in environment variables');
        }

        const url = `${baseUrl}/api/v1/chatbot/chat-progress`;

        // console.log(`Fetching chat progress for phone number: ${nomorhp}`);

        const response = await axios.get(url, {
            params: {
                phone: nomorhp, // Use the phone number dynamically
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        // console.log(response.data.data.chatProgresses)
        return response.data.data.chatProgresses; // Return the fetched data
    } catch (error) {
        console.error('Error fetching Progress Chat:', error.response?.data || error.message);
        throw new Error('Failed to fetch Progress Chat');
    }
}

module.exports = { getProgressChat };
