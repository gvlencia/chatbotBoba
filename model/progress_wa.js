const mongoose = require('mongoose');
const { Schema } = mongoose;

const progresschat= new Schema ({
    nohp : { type: String, required: true },
    layanan: String,
    date : { type: Date, default: Date.now},
    status : Boolean,
})

module.exports = mongoose.model('progresschats', progresschat);