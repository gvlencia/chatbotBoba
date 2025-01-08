const { Client, LocalAuth } = require('whatsapp-web.js');

class WhatsAppService {
    constructor() {
        this.client = null;
    }

    createClient(nomorhp) {
        return new Client({
            authStrategy: new LocalAuth({
                clientId: nomorhp,
            }),
        });
    }

    async initializeClient(nomorhp, res) {
        console.log('Creating new WhatsApp client...');
        this.client = this.createClient(nomorhp);

        this.setupEventHandlers(res, nomorhp);
        await this.client.initialize();
        
        return this.client;
    }

    setupEventHandlers(res, nomorhp) {
        this.client.on('qr', (qr) => {
            console.log('QR Code generated');
            res.json({
                qr,
                message: 'Please scan the QR code to authenticate',
            });
        });

        this.client.on('authenticated', () => {
            console.log('Client authenticated using saved session!');
        });

        this.client.on('ready', async () => {
            console.log('Client is ready!');
            await postDataPhoneNumbers(nomorhp, res);
        });

        this.client.on('error', (error) => {
            console.error('Error initializing WhatsApp client:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    message: 'Failed to initialize WhatsApp client', 
                    error 
                });
            }
        });
    }

    async loadExistingSession(nomorhp) {
        console.log('Loading WhatsApp client...');
        this.client = this.createClient(nomorhp);
        
        this.client.on('authenticated', () => {
            console.log('Client authenticated using saved session!');
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client is ready!');
        });

        this.client.on('error', (error) => {
            console.error('Error initializing WhatsApp client:', error);
        });

        await this.client.initialize();
        return this.client;
    }

    async signOut(nomorhp) {
        if (this.client) {
            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp bot disconnected:', reason);
            });

            try {
                await this.client.destroy();
                console.log('WhatsApp client disconnected successfully.');
                this.client = null;
            } catch (error) {
                console.error('Error while disconnecting client:', error);
                throw error;
            }
        }
    }
}

module.exports = WhatsAppService;