// --- EVENTS ROUTES ---
// This file handles the event booking URLs.

const express = require('express');
const router = express.Router();

const { getEvents, getEvent, bookTickets } = require('../controllers/events');
const { protect } = require('../middleware/auth');

// 1. GET ALL EVENTS (Public - anyone can see events)
router.get('/', getEvents);

// 2. GET ONE EVENT (Public)
router.get('/:id', getEvent);

// 3. BOOK TICKETS (Private - must be logged in)
router.post('/:id/book', protect, bookTickets);

module.exports = router;
