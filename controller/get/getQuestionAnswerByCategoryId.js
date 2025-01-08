require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function getQuestionAnswerByCategoryId(categoryindex) {
    try {
        const baseUrl = process.env.API_BASE_URL;
        const url = `${baseUrl}/api/v1/chatbot/question/category/${categoryindex}`;

        const token = process.env.API_TOKEN; // Fetch token from environment variables

        const response = await axios.get(url, 
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.data.questions; // Return the fetched data
        
    } catch (error) {
        console.error('Error fetching Progress Chat:', error.message);
        throw new Error('Failed to Progress Chat');
    }
}

module.exports = { getQuestionAnswerByCategoryId };