const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    
  },
  longDescription: {
    type: String,
    
  },
  date: {
    type: String,
    
  },
  time: {
    type: String,
   
  },
  venue: {
    type: String,
  },
  duration: {
    type: String,
  },
expiresAt: {
    type: Date,
    default: function() {
        // Combine date and time fields to create a Date object
        if (this.date && this.time) {
            // Assuming date is 'YYYY-MM-DD' and time is 'HH:mm'
            const dateTimeString = `${this.date}T${this.time}:00.000Z`;
            const sessionDate = new Date(dateTimeString);
            // Add 4 hours
            return new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000);
        }
        return undefined;
    },
    index: { expires: 0 }
}       
});

const sessionModel = mongoose.model("Session", sessionSchema);

module.exports = sessionModel;
