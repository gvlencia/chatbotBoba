const mongoose = require('mongoose');
const { Schema } = mongoose;

const complain_refunds= new Schema ({
    pertanyaan : String,
    jawaban : String
})

module.exports = mongoose.model('complain_refund', complain_refunds);