class MessageHandler {
    constructor(client) {
        this.client = client;
    }

    async handleIncomingMessage(message) {
        console.log(message.from, message.body);
        const chatData = await progresschat.findOne({ nohp: message.from });
        
        if (!chatData || !chatData.status) {
            await this.handleNewUser(message);
        } else {
            await this.routeMessage(message, chatData);
        }
    }

    async handleNewUser(message) {
        if (message.body.toLowerCase().includes('halo boba')) {
            await this.startNewChat(message);
        } else {
            await this.client.sendMessage(
                message.from, 
                "Anda dapat memanggil ChatBot Boba dengan mengirimkan pesan: Halo Boba"
            );
        }
    }

    async startNewChat(message) {
        const welcomeMessage = await this.buildWelcomeMessage();
        await this.client.sendMessage(message.from, 'Halo, Selamat Datang di Call Center Borong Bareng');
        await this.client.sendMessage(message.from, welcomeMessage);
        
        await this.updateChatProgress(message.from, 'Begin', true);
    }

    async routeMessage(message, chatData) {
        const handlers = {
            'Begin': () => this.handleBeginState(message),
            'akun_pesanan': () => this.handleAkunPesanan(message),
            'payment_shipment': () => this.handlePaymentShipment(message),
            'complain_refund': () => this.handleComplainRefund(message),
            'Ending': () => this.handleEndingState(message),
        };

        const handler = handlers[chatData.layanan];
        if (handler) {
            await handler();
        }
    }
}