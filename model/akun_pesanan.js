const mongoose = require('mongoose');
const { Schema } = mongoose;

const akun_pesanan= new Schema ({
    pertanyaan : String,
    jawaban : String
})

module.exports = mongoose.model('akun_pesanan', akun_pesanan);