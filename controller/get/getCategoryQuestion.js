require('dotenv').config(); // Load environment variables
const axios = require('axios');

async function getCategoryQuestion() {
    try {
        const baseUrl = process.env.API_BASE_URL;
        const url = `${baseUrl}/api/v1/chatbot/question-category/index`;

        const token = process.env.API_TOKEN; // Fetch token from environment variables

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        // console.log(response.data.data.question_categories)
        return response.data.data.question_categories; // Return the fetched data
        
    } catch (error) {
        console.error('Error fetching Category Question:', error.message);
        throw new Error('Failed to Category Question');
    }
}

module.exports = { getCategoryQuestion };