const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleAuth;
    }
  },
  isGoogleAuth: {
    type: Boolean,
    default: false
  },
  profilePicture: String,
  city: String,
  contact: String,
  location: {
    lat: Number,
    lng: Number
  },
  availableBeds: {
    type: Number,
    default: 0
  },
  icuBeds: {
    type: Number,
    default: 0
  },
  specialties: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Hospital', hospitalSchema); 