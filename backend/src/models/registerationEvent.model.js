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
    teamName: {
        type: String,
        default: null,
        maxlength: 80,
    },
    overallStatus: {
        type: String,
        enum: ['submitted', 'in_progress', 'waitlisted', 'selected', 'rejected', 'withdrawn'],
        default: 'submitted',
        index: true,
    },
    currentRound: {
        type: Number,
        default: 0,
    },
    reviewerNotes: {
        type: String,
        default: '',
        maxlength: 4000,
    },
    score: {
        type: Number,
        default: null,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },

});

registerationEventSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
registerationEventSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const registerationEventModel = mongoose.model('RegisterationEvent', registerationEventSchema);

module.exports = registerationEventModel;
