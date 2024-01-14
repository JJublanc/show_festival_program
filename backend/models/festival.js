const mongoose = require('mongoose');

const festivalSchema = mongoose.Schema({
    name: {type: String, required: true},
    start: {type: Date, required: true},
    end: {type: Date, required: true}
});

module.exports = mongoose.model('Festival', festivalSchema);