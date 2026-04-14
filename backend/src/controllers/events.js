// --- EVENTS CONTROLLER ---
// This file handles event ticketing, like booking a table or a special dinner show.

// Import models.
const Event = require('../models/Event');

// 1. GET ALL EVENTS (What's happening nearby?)
exports.getEvents = async (req, res) => {
  try {
    console.log('--- GETTING LIST OF ALL EVENTS ---');
    
    // We search the database for all events.
    const allTheEventsFound = await Event.find().populate('restaurantId', 'name');

    console.log('Found ' + allTheEventsFound.length + ' events.');

    res.status(200).json({
      success: true,
      count: allTheEventsFound.length,
      data: allTheEventsFound
    });

  } catch (err) {
    console.log('Error while getting events: ' + err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

// 2. GET ONE EVENT (Show me details)
exports.getEvent = async (req, res) => {
  try {
    const idFromTheUrl = req.params.id;
    console.log('--- GETTING DETAILS FOR EVENT: ' + idFromTheUrl + ' ---');
    
    // Search by ID.
    const oneEventData = await Event.findById(idFromTheUrl).populate('restaurantId', 'name');

    if (!oneEventData) {
      console.log('Could not find that event!');
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({
      success: true,
      data: oneEventData
    });

  } catch (err) {
    console.log('Error while getting event details: ' + err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

// 3. BOOK TICKETS FOR AN EVENT
exports.bookTickets = async (req, res) => {
  try {
    const eventToBookId = req.params.id;
    const numberOfTickets = req.body.tickets || 1;
    console.log('--- BOOKING ' + numberOfTickets + ' TICKETS FOR EVENT: ' + eventToBookId + ' ---');

    // Find the event.
    const eventFound = await Event.findById(eventToBookId);
    if (!eventFound) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Step: Check if there are enough tickets left!
    if (eventFound.availableTickets < numberOfTickets) {
      console.log('Error: Not enough tickets left. Available: ' + eventFound.availableTickets);
      return res.status(400).json({ 
        success: false, 
        error: 'Sorry! Only ' + eventFound.availableTickets + ' tickets are left.' 
      });
    }

    // Update the number of available tickets in the database.
    eventFound.availableTickets = eventFound.availableTickets - numberOfTickets;
    await eventFound.save();

    console.log('Tickets booked successfully!');

    res.status(200).json({
      success: true,
      message: 'Tickets booked successfully! See you there!',
      ticketsBooked: numberOfTickets,
      remainingTickets: eventFound.availableTickets
    });

  } catch (err) {
    console.log('Booking Error: ' + err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};
