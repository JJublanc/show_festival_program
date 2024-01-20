const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema({
    date: {type: String, required: true},
    location: {type: String, required: true},
    start: {type: String, required: true},
    end: {type: String, required: true},
    time: {type: String, required: true},
});

const showSchema = mongoose.Schema({
    festival: {type: String, required: true},
    title: {type: String, required: true},
    description: {type: String, required: true},
    duration: {type: String, required: true},
    imageURL: {type: String, required: true},
    director: {type: String, required: false},
    sessions: [sessionSchema],
});

showSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Show', showSchema);

