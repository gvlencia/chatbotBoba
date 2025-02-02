const { Client, MessageMedia, MessageAck, RemoteAuth, LocalAuth } = require('whatsapp-web.js');
// const { AwsS3Store, S3Client } = require('./src/AwsS3Store')

// const s3 = new S3Client({
//     region: process.env.AWS_DEFAULT_REGION,
//     credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//     },
//     httpOptions: {
//         timeout: 600000, // 10 minutes <-- increase this value for large file uploads
//     },
// });

// const store = new AwsS3Store({
//     bucketName: process.env.AWS_BUCKET,
//     remoteDataPath: 'public/chatbot',
//     s3Client: s3,
// });

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
// app.use(cors());
app.use(express.json());

app.use(cors({
    origin: ['https://collective.technologycellar.com/', 'https://api-collective.technologycellar.com/', 'https://borongbareng.com/', 'https://api.borongbareng.com/'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

let client;

let questionAnswer;

const createWhatsappSession = (nomorhp, res) => {
    console.log('Creating new WhatsApp client...');

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: nomorhp,
            // dataPath: './.wwebjs_auth',
            // store: store,
            // backupSyncIntervalMs: 600000
        }),
        // puppeteer: {
        //     headless: true, // Ensures no UI is shown
        //     args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], // Disables unnecessary features
        // }
    });

    // Handle QR code generation
    client.on('qr', (qr) => {
        console.log('QR Code generated');
        res.json({
            qr,
            message: 'Please scan the QR code to authenticate',
        }); // Send QR code as soon as it is generated
    });

    // console.log(client)

    // Handle authentication
    client.on('authenticated', () => {
        console.log('Client authenticated using saved session!');
    });

    client.on('auth_failure', msg => {
        console.error('WhatsApp client authentication failure', msg);
    });

    console.log("mau ready nihhh")

    // client.on('remote_session_saved', () => {
    //     console.log("remote_session_saved");
    //  })

    // Handle when the client is ready
    client.on('ready', () => {
        console.log('Client is ready!');
        res.json({
            login: true,
            message: 'Whatsapp ready',
        });
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
                // dataPath: 'session',
                // store: store,
                // backupSyncIntervalMs: 600000
            }),
            // puppeteer: {
            //     headless: true, // Ensures no UI is shown
            //     args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], // Disables unnecessary features
            // }
        });


        // Handle authentication
        client.on('authenticated', () => {
            console.log('Client authenticated using saved session!');
        });

        // Handle when the client is ready
        client.on('ready', () => {
            console.log('WhatsApp client is ready!');
            res.json({
                message: 'Whatsapp ready',
            });
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
        if (!data) {
            console.log(`Phone number ${data.nomorhp} not found in database.`);
            return { success: false, message: `Phone number ${data.nomorhp} not found.` };
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
                res.json({
                    message: 'Whatsapp Logout',
                });
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
        console.log(savedNumbers)
        if (!savedNumbers) {
            console.log('No saved phone numbers found.');
            return;
        }

        try {
            console.log(`Loading session for ${savedNumbers.phone}...`);
            await loadWhatsappSession(savedNumbers.phone); // Initialize the session
            console.log(`Session loaded for ${savedNumbers.phone}`);
        } catch (error) {
            console.error(`Failed to load session for ${savedNumbers.phone}:`, error);
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
        if (data) {
            loadWhatsappSession(nomorhp); // Await session loading
            // res.json(result); // Send the session status
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
    const { phones, message } = req.body; // Correct destructuring
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ message: 'Valid phone numbers are required' });
    }
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Valid message is required' });
    }
    try {
        await WhatsappBroadcast(phones, message); // Pass `phones` and `message`
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

const delay = 5000;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

const WhatsappBroadcast = async (phonenumbers, message) => {
    for (let i = 0; i < phonenumbers.length; i++) {
        const number = phonenumbers[i]; // Directly get the number as a string
        const sanitized_number = number.toString().replace(/[- )(]/g, "");
        let final_number;
        if (sanitized_number.startsWith("62")) {
            // If already starts with country code
            final_number = sanitized_number;
        } else if (sanitized_number.length === 10) {
            // Add the country code for 11-digit numbers
            final_number = `62${sanitized_number}`;
        } else if (sanitized_number.length === 11) {
            // Add the country code for 11-digit numbers
            final_number = `62${sanitized_number}`;
        } else if (sanitized_number.length === 12) {
            // Add the country code for 12-digit numbers
            final_number = `62${sanitized_number}`;
        } else {
            console.warn(`Invalid phone number: ${number}`);
            // continue; // Skip invalid numbers
        }

        try {
            const number_details = await client.getNumberId(final_number);

            // Skip if number_details is null or undefined
            if (!number_details) {
                console.warn(`Skipping: No WhatsApp account found for ${final_number}`);
                continue;
            }

            await client.sendMessage(number_details._serialized, message);
            console.log('Message sent successfully to', number_details._serialized);
        } catch (error) {
            console.error('Error sending message to', number, error);
        }

        await sleep(delay);
    }
};



const sendMessage = async (phonenumber, message) => {
    const number = phonenumber;
    const sanitized_number = number.toString().replace(/[- )(]/g, "");
    let final_number;
        if (sanitized_number.startsWith("62")) {
            // If already starts with country code
            final_number = sanitized_number;
        } else if (sanitized_number.length === 10) {
            // Add the country code for 11-digit numbers
            final_number = `62${sanitized_number}`;
        } else if (sanitized_number.length === 11) {
            // Add the country code for 11-digit numbers
            final_number = `62${sanitized_number}`;
        } else if (sanitized_number.length === 12) {
            // Add the country code for 12-digit numbers
            final_number = `62${sanitized_number}`;
        } else {
            console.warn(`Invalid phone number: ${number}`);
            // continue; // Skip invalid numbers
        }
    try{
        const number_details = await client.getNumberId(final_number);
        if (!number_details) {
            console.warn(`Skipping: No WhatsApp account found for ${final_number}`);
        }
        await client.sendMessage(number_details._serialized, message);
        console.log('Message sent successfully to', number)
    } catch (error) {
        console.error('Error sending message to', number, error)
    }
}

// Send Message 
app.post('/sendmessage', async (req, res) => {
    const { phone, message } = req.body;

    // Validate the phone number
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
        return res.status(400).json({ message: 'A valid phone number is required' });
    }

    // Validate the message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'A valid message is required' });
    }

    try {
        await sendMessage(phone, message); // Call your message sending function
        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


const chatWhatsApp = (client) => {
    client.on('message', async (message) => {
        console.log(message.from);
        console.log(message.body);
    
        const query = await getProgressChat(message.from);  
        // const query = progresschat.findOne({ nohp : message.from});
        console.log('Data Progress WA yang masuk:', query.chatProgress);
        
        //when user firsttime using chatbot
        if (message.from == '6281294517197@c.us') {
            if ((message.body).toLowerCase().includes('hubungkan')){
                const query = await getProgressChat('6285275530651@c.us');  
                await client.sendMessage(message.from, 'Anda telah terhubung dengan pelanggan');
                await client.sendMessage(query.chatProgress.phone, 'Saat ini anda telah terhubung dengan Customer Service Sekar Wulan.\nJika ingin mengakhiri percakapan, silahkan balas dengan Selesai');

                
            } else if ((message.body).toLowerCase().includes('tidak')){
                const query = await getProgressChat('6285275530651@c.us');  
                await updateProgressChat(query.chatProgress.phone, 'Begin', true);

                await client.sendMessage(message.from, 'Anda telah menolak untuk terhubung dengan pelanggan');
                await client.sendMessage(query.chatProgress.phone, 'Maaf saat ini Customer Service sedang sibuk, silahkan pilih layanan yang anda inginkan kembali');

            } else if ((message.body).toLowerCase().includes('selesai')){
                const query = await getProgressChat('6285275530651@c.us');  
                await updateProgressChat(query.chatProgress.phone, 'Ending', false);

                await client.sendMessage(query.chatProgress.phone, 'Terima kasih telah menggunakan layanan Customer Service Borong Bareng');
                await client.sendMessage(message.from, 'Anda telah menyelesaikan percakapan dengan pelanggan');

            } else {
                const query = await getProgressChat('6285275530651@c.us');  

                await client.sendMessage(query.chatProgress.phone, message.body);
            }
        }

        else if (query.chatProgress?.service == 'Customer Service' && query.chatProgress?.status == '1'){
            if ((message.body).toLowerCase().includes('selesai')){
                // const query = await getProgressChat('6285275530651@c.us');  
                await updateProgressChat(message.from, 'Ending', false);

                await client.sendMessage(message.from, 'Terima kasih telah menggunakan layanan Customer Service Borong Bareng');
                await client.sendMessage('6281294517197@c.us', 'Anda telah menyelesaikan percakapan dengan pelanggan');
            } else {
                await client.sendMessage('6281294517197@c.us', message.body);
            }
        }

        else if(!query.chatProgress || query.chatProgress.status == 0){
            console.log("masuk sini")
            if ((message.body).toLowerCase().includes('halo boba')){
                const sendWelcomeMessage = async () => {
                    let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan: ';
                    try {
                        const pertanyaan = await getCategoryQuestion();
                        pertanyaan.forEach((item, index) => {
                            console.log(item.name)
                            kalimatAwal += `\n${index + 1}. ${item.name}`;
                        });
                        kalimatAwal += '\n#. Untuk berbicara dengan Customer Service';
                        
                        await client.sendMessage(message.from, 'Halo, Selamat Datang di Call Center Borong Bareng');
                        await client.sendMessage(message.from, kalimatAwal);
                    } catch (err) {
                        console.error(err);
                    }
                };

                try {
                    if (!query.chatProgress) {
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
        else if (query.chatProgress.service == 'Begin'){
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
                        if (message.body === '#') {
                            await updateProgressChat(message.from, 'Customer Service', true);
                            await client.sendMessage(message.from, 'Mohon ditunggu sebentar, saya akan menghubungkan anda dengan Customer Service.');
                            await client.sendMessage('6281294517197@c.us', `Ada pelanggan yang ingin berbicara dengan Customer Service. \nNomor HP:  ${message.from}\nBalas dengan 'Hubungkan' jika ingin terhubung dengan pelanggan`);
                        } else {
                            await client.sendMessage(message.from, 'Mohon maaf kami tidak memahami respon anda.');
            
                            let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                            questions.forEach((item, index) => {
                                kalimatAwal += `\n${index + 1}. ${item.name}`; // Assuming `item.name` holds the category name
                            });
                            kalimatAwal += '\n#. Untuk berbicara dengan Customer Service';
                
                            await client.sendMessage(message.from, kalimatAwal);
                        }
                        
                    }
                } catch (error) {
                    console.error('Error fetching questions or sending messages:', error);
                }
            })();
        }

        //when user last service in akun_pesanan using chatbot
        else if (query.chatProgress.service !== 'Begin' && query.chatProgress.status == 1 && query.chatProgress.service !== 'Ending' ){

            if (message.body === "0") {
                let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan: ';
                try {
                    const pertanyaan = await getCategoryQuestion();
                    pertanyaan.forEach((item, index) => {
                        kalimatAwal += `\n${index + 1}. ${item.name}`;
                    });
                    kalimatAwal += '\n#. Untuk berbicara dengan Customer Service';

                    await updateProgressChat(message.from, 'Begin', true);
                    await client.sendMessage(message.from, kalimatAwal);
                } catch (err) {
                    console.error(err);
                }
            } else {
                const questionAnswer = await getQuestionAnswerByCategoryId(query.chatProgress.service);
                const selectedQuestion = questionAnswer[parseInt(message.body) - 1];

                if (selectedQuestion) {
                    (async () => {
                        try {
                            if (selectedQuestion.broadcast_files.length > 0) {
                                const file = selectedQuestion.broadcast_files;
                
                                // Use a for...of loop for asynchronous operations
                                for (const item of file) {
                                    const media = await MessageMedia.fromUrl(item.file_path);
                                    await client.sendMessage(message.from, media);
                                }
                            }
                
                            // Send the answer from selectedQuestion
                            await client.sendMessage(message.from, selectedQuestion.answer);
                
                            // Send a follow-up message after the answer
                            await client.sendMessage(
                                message.from, 
                                'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak'
                            );
                
                            // Update the chat progress after messages are sent
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
                    console.log(questionAnswer)
                    questionAnswer.forEach((item, index) => {
                        pilihanakun_pilihan += `\n${index + 1}. ${item.question}`;
                    });
    
                    client.sendMessage(message.from, pilihanakun_pilihan + '\n' + backtomenu);
                }
            }
        }
        
        
        else if (query.chatProgress.service == "Ending" && query.chatProgress.status == true){
            if ((message.body).toLowerCase().includes('ya')){
                const sendWelcomeMessage = async () => {
                    let kalimatAwal = '';
                    let pilihanPertanyaan = ''
                    try {
                        const pertanyaanLagi = await getCategoryQuestion();
                        pertanyaanLagi.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.name}`;
                        });
                        kalimatAwal += '\n#. Untuk berbicara dengan Customer Service';
                        
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
