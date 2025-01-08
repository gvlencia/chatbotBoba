const { Client, LocalAuth, MessageMedia, MessageAck } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());


const { MongoStore } = require('wwebjs-mongo');


const server = require('http').Server(app);
// const io = require('socket.io')(server, {
//     cors: {
//       origin: 'http://localhost:3000'
//   }
// });

// Specify the database name in the connection string
// const databaseUrl = "mongodb+srv://gaizkavalencia1:RhrafLkklqyzzqTH@cluster0.p0ajoom.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const urldatabase = process.env.MONGODB_URI;
// const databaseUrl = process.env.MONGODB_URI;

// // Connect to MongoDB using Mongoose
// console.log("Connect DB ...")
// mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 })
//   .then(() => {
//     console.log('Connected to MongoDB databaseWABoba');

//     // Create the store after successful connection
//     const store = new MongoStore({ mongoose: mongoose });
//   })
//   .catch(err => {
//     console.error('Error connecting to MongoDB:', err);
//   });

// // Access the database connection
// const database = mongoose.connection;

// Log a message when connected
// database.once("connected", () => {
//     console.log("Connected to MongoDB databaseWABoba");
// });

// // Handle connection errors
// database.on("error", (error) => {
//     console.error("MongoDB connection error:", error);
// });




const progresschat = require('./model/progress_wa');
const pertanyaanumum = require('./model/default_question')
const akun_pesanan = require('./model/akun_pesanan')
const payment_shipment = require('./model/payment_shipments')
const complain_refund = require('./model/complain_refund')
const nomorhpdefault = require('./model/default_number');

const { postDataPhoneNumbers } = require('./controller/post/postPhoneNumbers');
const { getDataPhoneNumbers } = require('./controller/get/getPhoneNumbers');
const { deleteDataPhoneNumbers } = require('./controller/delete/deletePhoneNumbers')
const { connect } = require('http2');

const { postProgressChat } = require('./controller/post/postProgressChat');
const { getProgressChat } = require('./controller/get/getProgressChat');
const { updateProgressChat } = require('./controller/update/upgradeProgressChat');

const { getQuestionAnswerByCategoryId } = require('./controller/get/getQuestionAnswerByCategoryId');
const { getCategoryQuestion } = require('./controller/get/getCategoryQuestion');


const backtomenu = '0. Kembali ke menu utama';

// Middleware
app.use(cors());
app.use(express.json());

let client;
let qrstring;
let contactnumber;
let status_socket = false;

let questionAnswer;

const createWhatsappSession = (nomorhp, res) => {
    console.log('Creating new WhatsApp client...');

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: nomorhp,
        }),
    });

    // Handle QR code generation
    client.on('qr', (qr) => {
        console.log('QR Code generated');
        res.json({
            qr,
            message: 'Please scan the QR code to authenticate',
        }); // Send QR code as soon as it is generated
    });

    // Handle authentication
    client.on('authenticated', () => {
        console.log('Client authenticated using saved session!');
    });

    // Handle when the client is ready
    client.on('ready', () => {
        console.log('Client is ready!');
        postDataPhoneNumbers(nomorhp, res);
    });

    // Handle errors during initialization
    client.on('error', (error) => {
        console.error('Error initializing WhatsApp client:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to initialize WhatsApp client', error });
        }
    });

    client.initialize();

    // Start chat functionality
    chatWhatsApp(client);
};


const loadWhatsappSession = (nomorhp) => {
    console.log('Loading WhatsApp client...');

    console.log(nomorhp)
    
        client = new Client({
            authStrategy: new LocalAuth({
                clientId: nomorhp,
            }),
        });


        // Handle authentication
        client.on('authenticated', () => {
            console.log('Client authenticated using saved session!');
        });

        // Handle when the client is ready
        client.on('ready', () => {
            console.log('WhatsApp client is ready!');
        });

        // Handle errors during initialization
        client.on('error', (error) => {
            console.error('Error initializing WhatsApp client:', error);
        });

        client.initialize();

        // Start chat functionality
        chatWhatsApp(client);
};


const signoutWhatsappSession = async (nomorhp, res) => {
    try {
        // Find and delete the phone number from the database
        const data = await getDataPhoneNumbers();
        if (!data.data.chatbot_number) {
            console.log(`Phone number ${nomorhp} not found in database.`);
            return { success: false, message: `Phone number ${nomorhp} not found.` };
        }

        // Delete from database first
        await deleteDataPhoneNumbers(nomorhp, res);
        console.log(`Phone number ${nomorhp} deleted from database.`);

        // Disconnect the WhatsApp client if it exists
        if (client) {
            // Set up disconnection handler before destroying
            client.on('disconnected', (reason) => {
                console.log('WhatsApp bot disconnected:', reason);
            });

            try {
                await client.destroy();
                console.log('WhatsApp client disconnected successfully.');
                client = null; // Clear the client reference
            } catch (disconnectError) {
                console.error('Error while disconnecting client:', disconnectError);
                // Continue execution even if disconnect fails
            }
        } else {
            console.log('No active WhatsApp client to disconnect.');
        }

        return { 
            success: true, 
            message: 'WhatsApp session signed out successfully.' 
        };
    } catch (error) {
        console.error('Error during signout:', error);
        return {
            success: false,
            message: 'Error signing out WhatsApp session.',
            error: error.message
        };
    }
};


const initializeWhatsappSessions = async () => {
    try {
        console.log('Initializing WhatsApp sessions for saved phone numbers...');
        const savedNumbers = await getDataPhoneNumbers(); // Query all saved phone numbers
        console.log(savedNumbers.data.chatbot_number)
        if (!savedNumbers.data.chatbot_number) {
            console.log('No saved phone numbers found.');
            return;
        }

        try {
            console.log(`Loading session for ${savedNumbers.data.chatbot_number.phone}...`);
            await loadWhatsappSession(savedNumbers.data.chatbot_number.phone); // Initialize the session
            console.log(`Session loaded for ${savedNumbers.data.chatbot_number.phone}`);
        } catch (error) {
            console.error(`Failed to load session for ${savedNumbers.data.chatbot_number.phone}:`, error);
        }
    } catch (error) {
        console.error('Error initializing WhatsApp sessions:', error);
    }
};


// Get default phone number
app.get('/default-phone', async (req, res) => {
    try {
        const data = await getDataPhoneNumbers();
        if (data) {
            console.log(data.phonenumber + ' data ditemukan');
            res.json({ nomorlogin: data.phonenumber });
        } else {
            res.status(404).json({ message: 'No phone number found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/login', async (req, res) => {
    const { nomorhp } = req.body;
    if (!nomorhp) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const data = await getDataPhoneNumbers();
        if (data.phone) {
            const result = await loadWhatsappSession(nomorhp); // Await session loading
            res.json(result); // Send the session status
          } else {
            // Handle case when no data is found
            createWhatsappSession(nomorhp, res); // Pass `res` to handle QR generation response
          }
    } catch (error) {
        console.error('Error in login endpoint:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Broadcast message
app.post('/broadcast', async (req, res) => {
    const { phonenumbers, message } = req.body;
    if (!phonenumbers || !Array.isArray(phonenumbers)) {
        return res.status(400).json({ message: 'Valid phone numbers are required' });
    }

    try {
        await WhatsappBroadcast(phonenumbers, message);
        res.json({ message: 'Broadcast sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Sign out
app.post('/signout', async (req, res) => {
    const { nomorhp } = req.body;
    if (!nomorhp) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        console.log(nomorhp)
        await signoutWhatsappSession(nomorhp, res);
    } catch (error) {
        console.error('Error in signout route:', error);
        // res.status(500).json({ message: 'Failed to sign out WhatsApp session.' });
    }
});

// io.on('connection', (socket) => {
//     console.log(`Socket ${socket.id} connected`);

//     if(status_socket){
//         const connected = "Connect!!!"
//         socket.emit('status', {connected})
//     }

//     const ceknomor = nomorhpdefault.findOne({});
//     ceknomor.then(async (data) => {
//         if(data){
//             console.log(data.phonenumber + ' data ditemukan')
//             const nomorlogin = data.phonenumber
//             socket.emit('nomorlogin', {nomorlogin})
//         }
//     })

//     socket.on('login', (nomorhp) => {
//         nomorhpinput = nomorhp.nomorhp;
//         const ceknomor = nomorhpdefault.findOne({phonenumber : nomorhpinput});
//         ceknomor.then(async (data) => {
//             if(data){
//                 console.log(nomorhpinput)
//                 loadWhatsappSession(nomorhpinput, socket)
//             } else {
//                 createWhatsappSession(nomorhpinput, socket)
//             }
//         })
//     })

//     socket.on('broadcast', async (phonenumbers) => {
//         WhatsappBroadcast(phonenumbers);
//     })

//     socket.on('signout', async (signout) => {
//         singoutWhatsappSession(socket);
//     })
// })

const WhatsappBroadcast = async (phonenumbers, message) => {
    for (let i = 0; i < phonenumbers.length; i++) {
        const number = phonenumbers[i];
        try{
            const number_details = await client.getNumberId(number);
            await client.sendMessage(number_details._serialized, message);
            console.log('Message sent successfully to', number);
        } catch (error) {
            console.error('Error sending message to', number, error);
        }

        await sleep(delay);
    }
}

const sendMessage = async (phonenumber, message) => {
    const number = phonenumber;
    try{
        const number_details = await client.getNumberId(number);
        await client.sendMessage(number_details._serialized, message);
        console.log('Message sent successfully to', number)
    } catch (error) {
        console.error('Error sending message to', number, error)
    }
}

// Send Message 
app.post('/sendmessage', async (req, res) => {
    const { phonenumber, message } = req.body;
    if (!phonenumber || !Array.isArray(phonenumber)) {
        return res.status(400).json({ message: 'Valid phone numbers are required' });
    }

    try {
        await sendMessage(phonenumber, message);
        res.json({ message: 'Broadcast sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// client = new Client({
//     authStrategy: new LocalAuth({
//         dataPath: 'login'
//     })
// });

// client.on('qr', qr => {
//     qrcode.generate(qr, {small: true});
// });

// client.on('ready', () => {
//     console.log('Client is ready!');
// });

const chatWhatsApp = (client) => {
    client.on('message', async (message) => {
        console.log(message.from);
        console.log(message.body);
    
        const query = await getProgressChat(message.from);  
        // const query = progresschat.findOne({ nohp : message.from});
        console.log('Data Progress WA yang masuk:', query[0]);
        
        //when user firsttime using chatbot
        if(!query[0] || query[0].status == 0){
            if ((message.body).toLowerCase().includes('halo boba')){
                const sendWelcomeMessage = async () => {
                    let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan: ';
                    try {
                        const pertanyaan = await getCategoryQuestion();
                        pertanyaan.forEach((item, index) => {
                            console.log(item.name)
                            kalimatAwal += `\n${index + 1}. ${item.name}`;
                        });
                        
                        await client.sendMessage(message.from, 'Halo, Selamat Datang di Call Center Borong Bareng');
                        await client.sendMessage(message.from, kalimatAwal);
                    } catch (err) {
                        console.error(err);
                    }
                };

                try {
                    if (!query) {
                        await postProgressChat(message.from, 'Begin', true);
                        await sendWelcomeMessage();
                    } else {
                        await updateProgressChat(message.from, 'Begin', true);
                        await sendWelcomeMessage();
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                client.sendMessage(message.from, "Anda dapat memanggil ChatBot Boba dengan mengirimkan pesan: Halo Boba");
            }
        }

        //when user begin using chatbot or after send halo boba
        else if (query[0].service == 'Begin'){
            const handleReply = async (message, service, listPromise, replyText, backMenu) => {
                try {
                    const data = await listPromise; // Await the promise to get the data
                    let options = replyText;
            
                    data.forEach((item, index) => {
                        options += `\n${index + 1}. ${item.question}`;
                    });
            
                    await updateProgressChat(message.from, service, true); // Post progress to the chat service
                    await client.sendMessage(message.from, options + '\n' + backMenu); // Send the message with options
                } catch (error) {
                    console.error('Error in handleReply:', error);
                }
            };
            

            (async () => {
                try {
                    const questions = await getCategoryQuestion();
                    let shouldReply = false;
            
                    questions.forEach(async (item, index) => {
                        if (shouldReply || message.body !== String(index + 1)) return;
            
                        shouldReply = true;
            
                        // Fetch child questions for the selected category
                        const childQuestion = await getQuestionAnswerByCategoryId(message.body);
                        console.log(childQuestion)
            
                        if (childQuestion?.length > 0) {
                            questionAnswer = childQuestion
                            handleReply(
                                message,
                                childQuestion[0].question_category.index,
                                childQuestion,
                                `Berikut ini pertanyaan seputar ${childQuestion[0].question_category.name}:`,
                                backtomenu
                            );
                        } else {
                            await client.sendMessage(
                                message.from,
                                'Tidak ada pertanyaan yang tersedia untuk kategori ini.'
                            );
                        }
                    });
            
                    if (!shouldReply) {
                        await client.sendMessage(message.from, 'Mohon maaf kami tidak memahami respon anda.');
            
                        let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                        questions.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.name}`; // Assuming `item.name` holds the category name
                        });
            
                        await client.sendMessage(message.from, kalimatAwal);
                    }
                } catch (error) {
                    console.error('Error fetching questions or sending messages:', error);
                }
            })();
        }

        //when user last service in akun_pesanan using chatbot
        else if (query[0].service !== 'Begin' && query[0].status == 1 && query[0].service !== 'Ending' ){

            if (message.body === "0") {
                let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan: ';
                try {
                    const pertanyaan = await getCategoryQuestion();
                    pertanyaan.forEach((item, index) => {
                        kalimatAwal += `\n${index + 1}. ${item.name}`;
                    });

                    await updateProgressChat(message.from, 'Begin', true);
                    await client.sendMessage(message.from, kalimatAwal);
                } catch (err) {
                    console.error(err);
                }
            } else {
                const selectedQuestion = questionAnswer[parseInt(message.body) - 1];

                if (selectedQuestion) {
                    (async () => {
                        try {
                            // Kirim jawaban dari selectedQuestion
                            await client.sendMessage(message.from, selectedQuestion.answer);
                            
                            // Kirim pesan selanjutnya setelah jawaban terkirim
                            await client.sendMessage(
                                message.from, 
                                'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak'
                            );
                    
                            // Perbarui status layanan setelah pesan terkirim
                            await updateProgressChat(
                                message.from,
                                'Ending',
                                true
                            );
                        } catch (error) {
                            console.error(error);
                        }
                    })();
                } else {
                    let pilihanakun_pilihan = 'Mohon maaf kami tidak memahami respon anda.\nSilahkan pilih kembali:';
                    questionAnswer.forEach((item, index) => {
                        pilihanakun_pilihan += `\n${index + 1}. ${item.pertanyaan}`;
                    });
    
                    client.sendMessage(message.from, pilihanakun_pilihan + '\n' + backtomenu);
                }
            }
        }
        else if (query[0].service == "Ending" && query[0].status == true){
            if ((message.body).toLowerCase().includes('ya')){
                const sendWelcomeMessage = async () => {
                    let kalimatAwal = '';
                    let pilihanPertanyaan = ''
                    try {
                        const pertanyaanLagi = await getCategoryQuestion();
                        pertanyaanLagi.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.name}`;
                        });
                        
                        await client.sendMessage(message.from, 'Silahkan pilih salah satu layanan yang anda inginkan: ');
                        await client.sendMessage(message.from, kalimatAwal);
                    } catch (err) {
                        console.error(err);
                    }
                };

                try {
                    // localStorage.setItem(contact.number, "Begin")
                    await updateProgressChat(message.from, 'Begin', true);
                    await sendWelcomeMessage();
                } catch (err) {
                    console.error(err);
                }
            }
            else if ((message.body).toLowerCase().includes('tidak')){
                // localStorage.removeItem(contact.number)
                await updateProgressChat(message.from, 'Ending', false);
                await client.sendMessage(message.from, 'Terima kasih sudah menghubungi Customer Service Borong Bareng');
            } else {
                client.sendMessage(message.from, 'Mohon maaf saya tidak memahami respon anda.\nSilahkan kembali memilih berdasarkan pilihan tersebut:');
                client.sendMessage(message.from, 'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak');
            }
        }
    })
}


// Start the server
const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Initialize WhatsApp sessions
    await initializeWhatsappSessions();
});
