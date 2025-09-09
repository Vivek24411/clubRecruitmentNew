const mongoose = require('mongoose');

const registerationEventSchema = new mongoose.Schema({

    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    roundDetails: {
        type: Array,
        default: []
    },
    registeredAt: {
        type: Date,
        default: Date.now,
    },
    membersAccepted: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Student'}],
        default: []
    },
    membersOffered: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Student'}],
        default: []
    },
    numberOfRounds: {
        type: Number,
    },

});

const registerationEventModel = mongoose.model('RegisterationEvent', registerationEventSchema);

module.exports = registerationEventModel;