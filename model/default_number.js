const mongoose = require('mongoose');
const { Schema } = mongoose;

const default_number= new Schema ({
    phonenumber : String,
})

module.exports = mongoose.model('numbers', default_number);