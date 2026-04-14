// --- THE EVENT MODEL ---
// This file defines how an "Event" (like a table booking or special dinner) is saved.

const mongoose = require('mongoose');

// This is the "Blueprint" for an Event.
const eventSchemaBlueprint = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an event name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  date: {
    type: Date,
    required: [true, 'Please add a date and time for the event']
  },
  restaurantId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Restaurant', // The restaurant hosting the event.
    required: true
  },
  totalTickets: {
    type: Number,
    required: true
  },
  availableTickets: {
    type: Number,
    required: true
  },
  pricePerTicket: {
    type: Number,
    default: 0 // Some events might be free!
  },
  type: {
    type: String,
    enum: ['DINE_IN', 'EVENT_TICKET', 'TABLE_BOOKING'],
    default: 'DINE_IN'
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    default: 'UPCOMING'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model.
const Event = mongoose.model('Event', eventSchemaBlueprint);

// Export it!
module.exports = Event;
