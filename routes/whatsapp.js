const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/whatsappClient');
const whatsappService = new WhatsAppService();

router.post('/login', async (req, res) => {
    const { nomorhp } = req.body;
    if (!nomorhp) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const data = await getDataPhoneNumbers();
        if (data.phone) {
            const client = await whatsappService.loadExistingSession(nomorhp);
            res.json({ status: 'Session loaded successfully' });
        } else {
            await whatsappService.initializeClient(nomorhp, res);
        }
    } catch (error) {
        console.error('Error in login endpoint:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/signout', async (req, res) => {
    const { nomorhp } = req.body;
    if (!nomorhp) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        await whatsappService.signOut(nomorhp);
        await deleteDataPhoneNumbers(nomorhp, res);
        res.json({ 
            success: true, 
            message: 'WhatsApp session signed out successfully.' 
        });
    } catch (error) {
        console.error('Error in signout route:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to sign out WhatsApp session.',
            error: error.message
        });
    }
});

module.exports = router;