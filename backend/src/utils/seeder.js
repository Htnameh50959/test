const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Event = require('../models/Event');

// Load env vars
dotenv.config({ path: './.env' });

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

const cuisines = ['Italian', 'Chinese', 'Indian', 'Mexican', 'American', 'Thai', 'Japanese'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];

// Central point for seeding (New York area approx)
const centerLat = 40.7128;
const centerLng = -74.0060;

const generateRandomCoords = (centerLat, centerLng, radiusInKm) => {
  const radiusInDeg = radiusInKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return [centerLng + x, centerLat + y];
};

const seedData = async () => {
  try {
    // Clear current data
    await User.deleteMany();
    await Restaurant.deleteMany();
    await Event.deleteMany();

    console.log('Data Cleared...');

    // Create a merchant user
    const merchant = await User.create({
      email: 'merchant@example.com',
      password: 'password123',
      role: 'merchant',
      profile: { name: 'Master Merchant' }
    });

    // Create 50 restaurants
    const restaurants = [];
    for (let i = 1; i <= 50; i++) {
      const coords = generateRandomCoords(centerLat, centerLng, 10);
      restaurants.push({
        name: `Restaurant ${i}`,
        description: `This is the description for Restaurant ${i}, offering premium dining experiences.`,
        cuisineTypes: [cuisines[Math.floor(Math.random() * cuisines.length)]],
        location: {
          type: 'Point',
          coordinates: coords,
          address: {
            street: `${i} Main St`,
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          }
        },
        rating: {
          average: (Math.random() * (5 - 3) + 3).toFixed(1),
          count: Math.floor(Math.random() * 100)
        },
        priceRange: ['$', '$$', '$$$', '$$$$'][Math.floor(Math.random() * 4)],
        menu: [
          { name: 'Special Dish A', price: 15.99, category: 'Main' },
          { name: 'Special Dish B', price: 12.50, category: 'Main' },
          { name: 'Cool Drink', price: 5.00, category: 'Drinks' }
        ],
        hours: {
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' },
          wednesday: { open: '09:00', close: '22:00' },
          thursday: { open: '09:00', close: '22:00' },
          friday: { open: '09:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '21:00' }
        },
        tableCapacity: 20,
        merchantId: merchant._id
      });
    }
    await Restaurant.insertMany(restaurants);
    console.log('Restaurants Seeded...');

    // Create 10 events
    const events = [];
    for (let i = 1; i <= 10; i++) {
      const coords = generateRandomCoords(centerLat, centerLng, 5);
      events.push({
        title: `Big Event ${i}`,
        description: `Experience the best of live entertainment at Event ${i}.`,
        location: {
          venue: `Venue ${i}`,
          type: 'Point',
          coordinates: coords,
          address: { street: `${i} Broadway`, city: 'New York', state: 'NY' }
        },
        dateTime: {
          start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
        },
        category: ['Concert', 'Dining', 'Nightlife'][Math.floor(Math.random() * 3)],
        tickets: [
          { type: 'General', price: 50, available: 100 },
          { type: 'VIP', price: 150, available: 20 }
        ]
      });
    }
    await Event.insertMany(events);
    console.log('Events Seeded...');

    console.log('Data Import Completed!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();
