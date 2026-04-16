require('dotenv').config();
const mongoose = require('mongoose');
const Promo = require('../models/Promo');
const Event = require('../models/Event');
const Restaurant = require('../models/Restaurant');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Seed promos
  const promoCodes = [
    { code: 'WELCOME10', description: '10% off your first order', type: 'percentage', value: 10, minOrder: 100, maxDiscount: 100 },
    { code: 'FOODIE20', description: '20% off orders above ₹500', type: 'percentage', value: 20, minOrder: 500, maxDiscount: 200 },
    { code: 'SAVE15', description: 'Flat ₹15 off any order', type: 'flat', value: 15, minOrder: 0 },
    { code: 'PARTY50', description: '₹50 off on orders above ₹800', type: 'flat', value: 50, minOrder: 800 },
    { code: 'NEWUSER', description: 'New user special: 15% off up to ₹150', type: 'percentage', value: 15, minOrder: 200, maxDiscount: 150 },
  ];

  for (const p of promoCodes) {
    await Promo.findOneAndUpdate({ code: p.code }, p, { upsert: true, new: true });
    console.log(`Upserted promo: ${p.code}`);
  }

  // Seed events (only if no events exist)
  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    const restaurants = await Restaurant.find().limit(5);
    if (restaurants.length > 0) {
      const now = new Date();
      const events = [
        { name: 'Friday Jazz Night', description: 'Live jazz music with a 5-course dinner experience.', type: 'EVENT_TICKET', status: 'UPCOMING', pricePerTicket: 1500, totalTickets: 40, availableTickets: 28, restaurantId: restaurants[0]._id, date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
        { name: 'Chef\'s Table Experience', description: 'An intimate dining experience with our head chef.', type: 'DINE_IN', status: 'UPCOMING', pricePerTicket: 2500, totalTickets: 12, availableTickets: 4, restaurantId: restaurants[0]._id, date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        { name: 'Wine & Cheese Evening', description: 'Curated wine pairings with artisan cheese selection.', type: 'EVENT_TICKET', status: 'UPCOMING', pricePerTicket: 900, totalTickets: 30, availableTickets: 22, restaurantId: restaurants[1]._id || restaurants[0]._id, date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) },
        { name: 'Sunday Brunch Extravaganza', description: 'Unlimited brunch with live acoustic music.', type: 'DINE_IN', status: 'UPCOMING', pricePerTicket: 750, totalTickets: 60, availableTickets: 45, restaurantId: restaurants[2]._id || restaurants[0]._id, date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) },
        { name: 'Biryani Cook-Off Championship', description: 'Watch master chefs battle for the best biryani.', type: 'EVENT_TICKET', status: 'UPCOMING', pricePerTicket: 500, totalTickets: 80, availableTickets: 62, restaurantId: restaurants[3]._id || restaurants[0]._id, date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
        { name: 'Cocktail Masterclass', description: 'Learn mixology from professional bartenders.', type: 'EVENT_TICKET', status: 'UPCOMING', pricePerTicket: 1200, totalTickets: 20, availableTickets: 12, restaurantId: restaurants[4]._id || restaurants[0]._id, date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
      ];

      for (const ev of events) {
        await Event.create(ev);
        console.log(`Created event: ${ev.name}`);
      }
    } else {
      console.log('No restaurants found; skipping event seed.');
    }
  } else {
    console.log(`Events already exist (${eventCount}); skipping event seed.`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
