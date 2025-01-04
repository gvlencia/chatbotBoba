const { Client, LocalAuth, MessageMedia, MessageAck } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
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
const databaseUrl = "mongodb+srv://gaizkavalencia1:RhrafLkklqyzzqTH@cluster0.p0ajoom.mongodb.net/databaseWABoba?retryWrites=true&w=majority&appName=Cluster0"

// Connect to MongoDB using Mongoose
console.log("Connect DB ...")
mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('Connected to MongoDB databaseWABoba');

    // Create the store after successful connection
    const store = new MongoStore({ mongoose: mongoose });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// Access the database connection
const database = mongoose.connection;

// Log a message when connected
database.once("connected", () => {
    console.log("Connected to MongoDB databaseWABoba");
});

// Handle connection errors
database.on("error", (error) => {
    console.error("MongoDB connection error:", error);
});




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

const backtomenu = '0. Kembali ke menu utama';

// Middleware
app.use(cors());
app.use(express.json());

let client;
let qrstring;
let contactnumber;
let status_socket = false;

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
    
        const query = progresschat.findOne({ nohp : message.from});
        query.then(async (data) => {
            console.log('Data Progress WA yang masuk:', data);
    
            //when user firsttime using chatbot
            if(!data || data.status == false){
                if ((message.body).toLowerCase().includes('halo boba')){
                    const sendWelcomeMessage = async () => {
                        let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan: ';
                        try {
                            const pertanyaan = pertanyaanumum.find({});
                            pertanyaan.then((data) => {
                                data.forEach((item, index) => {
                                    kalimatAwal += `\n${index + 1}. ${item.pertanyaan}`;
                                })
                            })
                            
                            await client.sendMessage(message.from, 'Halo, Selamat Datang di Call Center Borong Bareng');
                            await client.sendMessage(message.from, kalimatAwal);
                        } catch (err) {
                            console.error(err);
                        }
                    };
    
                    try {
                        if (!data) {
                            const newData = new progresschat({
                                nohp: message.from,
                                layanan: 'Begin',
                                status: true,
                            });
                            await newData.save();
                            await sendWelcomeMessage();
                        } else {
                            await progresschat.updateOne(
                                { nohp: message.from },
                                { $set: { layanan: 'Begin', status: true } },
                            );
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
            else if (data.layanan == 'Begin'){
                const handleReply = (message, service, list, replyText, backMenu) => {
                    list.then((data) => {
                        let options = replyText;
                        data.forEach((item, index) => {
                            options += `\n${index + 1}. ${item.pertanyaan}`;
                        });
                        progresschat
                            .updateOne({ nohp: message.from }, { $set: { layanan: service } })
                            .then(() => {
                                client.sendMessage(message.from, options + '\n' + backMenu);
                            })
                            .catch(console.error);
                    });
                };
                pertanyaanumum.find({}).then((questions) => {
                    let shouldReply = false;
    
                    questions.forEach((item, index) => {
                        if (shouldReply || message.body !== String(index + 1)) return;
    
                        shouldReply = true;
    
                        if (message.body === "1") {
                            handleReply(message, "akun_pesanan", akun_pesanan.find({}),
                            'Berikut ini pertanyaan seputar Akun & Pesanan:', backtomenu);
                        } else if(message.body === "2") {
                            handleReply(message, "payment_shipment", payment_shipment.find({}),
                            'Berikut ini pertanyaan seputar Pembayaran & Pengiriman:', backtomenu);
                        } else if(message.body === "3") {
                            handleReply(message, "complain_refund", complain_refund.find({}),
                            'Berikut ini pertanyaan seputar Komplain dan Pengembalian Dana (Refund):', backtomenu);
                        }
                    });
                    if (!shouldReply) {
                        (async () => {
                            try {
                                await client.sendMessage(message.from, 'Mohon maaf kami tidak memahami respon anda.');
                                
                                let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                                questions.forEach((item, index) => {
                                    kalimatAwal += `\n${index + 1}. ${item.pertanyaan}`;
                                });
                
                                client.sendMessage(message.from, kalimatAwal);
                            } catch (error) {
                                console.error('Error sending messages:', error);
                            }
                        })();
                    }
                });
                
            }
    
            //when user last service in akun_pesanan using chatbot
            else if (data.layanan === 'akun_pesanan' && data.status === true ){
                if (message.body === "0") {
                    pertanyaanumum.find({}).then((questions) => {
                        let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                        questions.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.pertanyaan}`;
                        });
            
                        progresschat.updateOne(
                            { nohp: message.from },
                            { $set: { layanan: "Begin" } }
                        ).then(() => {
                            client.sendMessage(message.from, kalimatAwal);
                        }).catch(console.error);
                    });
                } else {
                    akun_pesanan.find({}).then((questions) => {
                        const selectedQuestion = questions[parseInt(message.body) - 1];
    
                        if (selectedQuestion) {
                            (async () => {
                                try {
                                    // Kirim jawaban dari selectedQuestion
                                    await client.sendMessage(message.from, selectedQuestion.jawaban);
                                    
                                    // Kirim pesan selanjutnya setelah jawaban terkirim
                                    await client.sendMessage(
                                        message.from, 
                                        'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak'
                                    );
                            
                                    // Perbarui status layanan setelah pesan terkirim
                                    await progresschat.updateOne(
                                        { nohp: message.from },
                                        { $set: { layanan: "Ending" } }
                                    );
                                } catch (error) {
                                    console.error(error);
                                }
                            })();
                           
                        } else {
                            let pilihanakun_pilihan = 'Mohon maaf kami tidak memahami respon anda.\nSilahkan pilih kembali:';
                            questions.forEach((item, index) => {
                                pilihanakun_pilihan += `\n${index + 1}. ${item.pertanyaan}`;
                            });
            
                            client.sendMessage(message.from, pilihanakun_pilihan + '\n' + backtomenu);
                        }
    
                    }).catch(console.error);
                }
            }
    
            //when user last service in payment_shipment using chatbot
            else if (data.layanan === 'payment_shipment' && data.status === true ){
                if (message.body === "0") {
                    pertanyaanumum.find({}).then((questions) => {
                        let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                        questions.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.pertanyaan}`;
                        });
            
                        progresschat.updateOne(
                            { nohp: message.from },
                            { $set: { layanan: "Begin" } }
                        ).then(() => {
                            client.sendMessage(message.from, kalimatAwal);
                        }).catch(console.error);
                    });
                } else {
                    payment_shipment.find({}).then((questions) => {
                        const selectedQuestion = questions[parseInt(message.body) - 1];
    
                        if (selectedQuestion) {
                            (async () => {
                                try {
                                    // Kirim jawaban dari selectedQuestion
                                    await client.sendMessage(message.from, selectedQuestion.jawaban);
                                    
                                    // Kirim pesan selanjutnya setelah jawaban terkirim
                                    await client.sendMessage(
                                        message.from, 
                                        'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak'
                                    );
                            
                                    // Perbarui status layanan setelah pesan terkirim
                                    await progresschat.updateOne(
                                        { nohp: message.from },
                                        { $set: { layanan: "Ending" } }
                                    );
                                } catch (error) {
                                    console.error(error);
                                }
                            })();
                           
                        } else {
                            let pilihan_payment_shipment = 'Mohon maaf kami tidak memahami respon anda.\nSilahkan pilih kembali:';
                            questions.forEach((item, index) => {
                                pilihan_payment_shipment += `\n${index + 1}. ${item.pertanyaan}`;
                            });
            
                            client.sendMessage(message.from, pilihan_payment_shipment + '\n' + backtomenu);
                        }
    
                    }).catch(console.error);
                }
            }
    
            //when user last service in complain_refund using chatbot
            else if (data.layanan === 'complain_refund' && data.status === true ){
                if (message.body === "0") {
                    pertanyaanumum.find({}).then((questions) => {
                        let kalimatAwal = 'Silahkan pilih salah satu layanan yang anda inginkan:';
                        questions.forEach((item, index) => {
                            kalimatAwal += `\n${index + 1}. ${item.pertanyaan}`;
                        });
            
                        progresschat.updateOne(
                            { nohp: message.from },
                            { $set: { layanan: "Begin" } }
                        ).then(() => {
                            client.sendMessage(message.from, kalimatAwal);
                        }).catch(console.error);
                    });
                } else {
                    complain_refund.find({}).then((questions) => {
                        const selectedQuestion = questions[parseInt(message.body) - 1];
    
                        if (selectedQuestion) {
                            (async () => {
                                try {
                                    // Kirim jawaban dari selectedQuestion
                                    await client.sendMessage(message.from, selectedQuestion.jawaban);
                                    
                                    // Kirim pesan selanjutnya setelah jawaban terkirim
                                    await client.sendMessage(
                                        message.from, 
                                        'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak'
                                    );
                            
                                    // Perbarui status layanan setelah pesan terkirim
                                    await progresschat.updateOne(
                                        { nohp: message.from },
                                        { $set: { layanan: "Ending" } }
                                    );
                                } catch (error) {
                                    console.error(error);
                                }
                            })();
                           
                        } else {
                            let pilihan_complain_refund = 'Mohon maaf kami tidak memahami respon anda.\nSilahkan pilih kembali:';
                            questions.forEach((item, index) => {
                                pilihan_complain_refund += `\n${index + 1}. ${item.pertanyaan}`;
                            });
            
                            client.sendMessage(message.from, pilihan_complain_refund + '\n' + backtomenu);
                        }
    
                    }).catch(console.error);
                }
            }
    
            //when user has get the final answer and wanna close the conversiation or back to main menu
            else if (data.layanan == "Ending" && data.status == true){
                if ((message.body).toLowerCase().includes('ya')){
                    const sendWelcomeMessage = async () => {
                        let kalimatAwal = '';
                        let pilihanPertanyaan = ''
                        try {
                            const pertanyaanLagi = pertanyaanumum.find({});
                            pertanyaanLagi.then((data) => {
                                data.forEach((item, index) => {
                                    kalimatAwal += `${index + 1}. ${item.pertanyaan}\n`;
                                    console.log(kalimatAwal)
                                })
                            })
                            
                            await client.sendMessage(message.from, 'Silahkan pilih salah satu layanan yang anda inginkan: ');
                            await client.sendMessage(message.from, kalimatAwal);
                        } catch (err) {
                            console.error(err);
                        }
                    };

                    try {
                        // localStorage.setItem(contact.number, "Begin")
                        progresschat.updateOne(
                            {nohp : message.from},
                            { $set : {layanan : "Begin"} },
                        ).then(() => {
                            sendWelcomeMessage();
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                    } catch (err) {
                        console.error(err);
                    }
                     
                    
                }
                else if ((message.body).toLowerCase().includes('tidak')){
                    
                    // localStorage.removeItem(contact.number)
                    progresschat.updateOne(
                        {nohp : message.from},
                        { $set : {status : false} },
                    ).then(()=> {
                        client.sendMessage(message.from, 'Terima kasih sudah menghubungi Customer Service Borong Bareng');
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                } else {
                    client.sendMessage(message.from, 'Mohon maaf saya tidak memahami respon anda.\nSilahkan kembali memilih berdasarkan pilihan tersebut:');
                    client.sendMessage(message.from, 'Apakah ada yang bisa dibantu lagi? \n\nBalas dengan Ya atau Tidak');
                }
            }
        });
    })
}

// Start the server
const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Initialize WhatsApp sessions
    await initializeWhatsappSessions();
});
