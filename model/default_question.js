const mongoose = require('mongoose');
const { Schema } = mongoose;

const defaultquestion= new Schema ({
    pertanyaan : String,
    jawaban : String,
    layanan : String
})

module.exports = mongoose.model('defaultquestion', defaultquestion);