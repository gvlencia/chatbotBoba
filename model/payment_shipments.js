const mongoose = require('mongoose');
const { Schema } = mongoose;

const payment_shipment= new Schema ({
    pertanyaan : String,
    jawaban : String
})

module.exports = mongoose.model('payment_shipment', payment_shipment);