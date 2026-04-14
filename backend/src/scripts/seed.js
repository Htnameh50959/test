// backend/src/scripts/seed.js
/**
 * DATA SEEDING SCRIPT
 * 
 * Sets up the initial state for the platform:
 * 1. Admin User (admin@foodiehub.com)
 * 2. Merchant User (merchant@foodiehub.com)
 * 3. Sample Restaurants owned by the merchant
 * 
 * RUN: npm run seed
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const MONGODB_URI = process.env.MONGO_URI;

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected ✓');

    // 1. Seed Admin User
    console.log('[Seed] Creating Admin user...');
    const adminData = {
      email: 'admin@foodiehub.com',
      password: 'password123',
      profile: {
        firstName: 'System',
        lastName: 'Admin',
        phone: '+919999999999'
      },
      role: 'admin',
      isVerified: true
    };

    let admin = await User.findOne({ email: 'admin@foodiehub.com' });
    if (admin) {
      Object.assign(admin, adminData);
      await admin.save();
      console.log('[Seed] Admin user updated ✓');
    } else {
      admin = await User.create(adminData);
      console.log('[Seed] Admin user created ✓');
    }

    // 2. Seed Merchant User
    console.log('[Seed] Creating Merchant user...');
    const merchantData = {
      email: 'merchant@foodiehub.com',
      password: 'password123',
      profile: {
        firstName: 'John',
        lastName: 'Merchant',
        phone: '+918888888888'
      },
      role: 'merchant',
      isVerified: true
    };

    let merchant = await User.findOne({ email: 'merchant@foodiehub.com' });
    if (merchant) {
      Object.assign(merchant, merchantData);
      await merchant.save();
      console.log('[Seed] Merchant user updated ✓');
    } else {
      merchant = await User.create(merchantData);
      console.log('[Seed] Merchant user created ✓');
    }

    // 3. Seed Restaurants
    console.log('[Seed] Creating Sample Restaurants...');
    
    const sampleRestaurants = [
      {
        name: 'The Spice Route',
        merchantId: merchant._id,
        description: 'Authentic Indian flavors with a modern twist.',
        cuisineTypes: ['Indian', 'Tandoori', 'Curry'],
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Bangalore
        address: { street: '123 MG Road', city: 'Bangalore', state: 'Karnataka', zipCode: '560001' },
        menu: [
          { name: 'Butter Chicken', price: 450, category: 'Main Course', description: 'Creamy tomato curry.' },
          { name: 'Paneer Tikka', price: 320, category: 'Starters', description: 'Grilled cheese.' }
        ],
        rating: { average: 4.5, count: 120 },
        isVerified: true,
        isFeatured: true
      },
      {
        name: 'Trattoria Bella',
        merchantId: merchant._id,
        description: 'Classic Italian wood-fired pizzas.',
        cuisineTypes: ['Italian', 'Pizza'],
        location: { type: 'Point', coordinates: [77.6413, 12.9352] }, // Koramangala
        address: { street: '45 80 Feet Road', city: 'Bangalore', state: 'Karnataka', zipCode: '560034' },
        menu: [
          { name: 'Margherita Pizza', price: 380, category: 'Pizza', description: 'Classic tomato and basil.' }
        ],
        rating: { average: 4.8, count: 85 },
        isVerified: true
      },
      {
        name: 'Coastal Curries',
        merchantId: merchant._id,
        description: 'Fresh seafood from the Konkan coast.',
        cuisineTypes: ['Seafood', 'Goan', 'Konkani'],
        location: { type: 'Point', coordinates: [72.8777, 19.0760] }, // Mumbai
        address: { street: 'Marina Drive', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
        menu: [
          { name: 'Prawn Balchao', price: 550, category: 'Main Course', description: 'Spicy Goan prawn preserve.' },
          { name: 'Fish Thali', price: 400, category: 'Main Course', description: 'Authentic coastal spread.' }
        ],
        rating: { average: 4.6, count: 150 },
        isVerified: true
      },
      {
        name: 'The Kebab Factory',
        merchantId: merchant._id,
        description: 'Legendary succulent kebabs and biryanis.',
        cuisineTypes: ['Mughlai', 'North Indian'],
        location: { type: 'Point', coordinates: [77.2090, 28.6139] }, // Delhi
        address: { street: 'Connaught Place', city: 'New Delhi', state: 'Delhi', zipCode: '110001' },
        menu: [
          { name: 'Galouti Kebab', price: 480, category: 'Starters', description: 'Melt-in-your-mouth minced meat kababs.' },
          { name: 'Mutton Biryani', price: 520, category: 'Main Course', description: 'Fragrant long-grain rice with tender lamb.' }
        ],
        rating: { average: 4.7, count: 320 },
        isVerified: true,
        isFeatured: true
      },
      {
        name: 'Bento Box',
        merchantId: merchant._id,
        description: 'Modern Japanese dining and sushi bar.',
        cuisineTypes: ['Japanese', 'Sushi', 'Asian'],
        location: { type: 'Point', coordinates: [72.8347, 18.9220] }, // Colaba, Mumbai
        address: { street: 'Colaba Causeway', city: 'Mumbai', state: 'Maharashtra', zipCode: '400005' },
        menu: [
          { name: 'Salmon Nigiri', price: 650, category: 'Sushi', description: 'Fresh Atlantic salmon over vinegared rice.' },
          { name: 'Chicken Teriyaki', price: 580, category: 'Main Course', description: 'Grilled chicken in sweet soy glaze.' }
        ],
        rating: { average: 4.4, count: 95 },
        isVerified: true
      },
      {
        name: 'Sagar Ratna',
        merchantId: merchant._id,
        description: 'South Indian vegetarian excellency.',
        cuisineTypes: ['South Indian', 'Vegetarian'],
        location: { type: 'Point', coordinates: [77.2167, 28.6667] }, // North Delhi
        address: { street: 'Ashok Vihar', city: 'New Delhi', state: 'Delhi', zipCode: '110052' },
        menu: [
          { name: 'Masala Dosa', price: 180, category: 'Main Course', description: 'Crispy rice crepe with potato filling.' }
        ],
        rating: { average: 4.3, count: 540 },
        isVerified: true
      },
      {
        name: 'Le Petit Cafe',
        merchantId: merchant._id,
        description: 'Authentic French bakery and bistro.',
        cuisineTypes: ['French', 'Bakery', 'Desserts'],
        location: { type: 'Point', coordinates: [73.8567, 18.5204] }, // Pune
        address: { street: 'Koregaon Park', city: 'Pune', state: 'Maharashtra', zipCode: '411001' },
        menu: [
          { name: 'Butter Croissant', price: 120, category: 'Bakery', description: 'Flaky, buttery French pastry.' },
          { name: 'Quiche Lorraine', price: 350, category: 'Main Course', description: 'Savory tart with bacon and cheese.' }
        ],
        rating: { average: 4.9, count: 65 },
        isVerified: true
      },
      {
        name: 'Wok Hei',
        merchantId: merchant._id,
        description: 'Authentic Cantonese street food.',
        cuisineTypes: ['Chinese', 'Cantonese'],
        location: { type: 'Point', coordinates: [88.3639, 22.5726] }, // Kolkata
        address: { street: 'Park Street', city: 'Kolkata', state: 'West Bengal', zipCode: '700016' },
        menu: [
          { name: 'Dim Sum Platter', price: 450, category: 'Starters', description: 'Assorted steamed dumplings.' }
        ],
        rating: { average: 4.5, count: 180 },
        isVerified: true
      },
      {
        name: 'Paradise Biryani',
        merchantId: merchant._id,
        description: 'World-famous authentic Hyderabadi Biryani since 1953.',
        cuisineTypes: ['Biryani', 'Mughlai', 'Indian'],
        location: { type: 'Point', coordinates: [78.4845, 17.4435] }, // Secunderabad
        address: { street: 'Paradise Circle', city: 'Hyderabad', state: 'Telangana', zipCode: '500003' },
        menu: [
          { name: 'Special Mutton Biryani', price: 420, category: 'Main Course', description: 'Legendary Hyderabadi mutton dum biryani.' },
          { name: 'Chicken 65', price: 350, category: 'Starters', description: 'Spicy, deep-fried chicken tempered with curry leaves.' }
        ],
        rating: { average: 4.7, count: 5200 },
        isVerified: true,
        isFeatured: true
      },
      {
        name: 'Shah Ghouse',
        merchantId: merchant._id,
        description: 'Iconic spot for authentic Haleem and Irani Chai.',
        cuisineTypes: ['Mughlai', 'Mandhi', 'Irani'],
        location: { type: 'Point', coordinates: [78.3752, 17.4474] }, // Gachibowli
        address: { street: 'Gachibowli Main Rd', city: 'Hyderabad', state: 'Telangana', zipCode: '500032' },
        menu: [
          { name: 'Mutton Haleem', price: 280, category: 'Seasonal', description: 'Rich, slow-cooked porridge with meat and lentils.' },
          { name: 'Chicken Mandi', price: 650, category: 'Mandhi', description: 'Traditional Arab-style rice with smoked chicken.' }
        ],
        rating: { average: 4.4, count: 1800 },
        isVerified: true
      },
      {
        name: 'Chutneys',
        merchantId: merchant._id,
        description: 'Gourmet South Indian tiffins with 6 varieties of chutneys.',
        cuisineTypes: ['South Indian', 'Vegetarian'],
        location: { type: 'Point', coordinates: [78.4485, 17.4150] }, // Banjara Hills
        address: { street: 'Road No. 1', city: 'Hyderabad', state: 'Telangana', zipCode: '500034' },
        menu: [
          { name: 'Guntur Idli', price: 180, category: 'Breakfast', description: 'Soft steamed idlis topped with spicy Guntur karam.' },
          { name: 'Babai Hotel Ghee Dosa', price: 220, category: 'Breakfast', description: 'Crispy dosa dripping with pure ghee.' }
        ],
        rating: { average: 4.5, count: 2100 },
        isVerified: true
      },
      {
        name: 'Bawarchi',
        merchantId: merchant._id,
        description: 'The cult favorite for Hyderabadi Dum Biryani.',
        cuisineTypes: ['Biryani', 'Indian'],
        location: { type: 'Point', coordinates: [78.4901, 17.4024] }, // RTC X Roads
        address: { street: 'RTC X Roads', city: 'Hyderabad', state: 'Telangana', zipCode: '500020' },
        menu: [
          { name: 'Mutton Dum Biryani', price: 380, category: 'Main Course', description: 'The absolute classic biryani.' }
        ],
        rating: { average: 4.6, count: 4500 },
        isVerified: true
      },
      {
        name: 'Pista House',
        merchantId: merchant._id,
        description: 'Global exporter of GI tagged Hyderabadi Haleem.',
        cuisineTypes: ['Bakery', 'Mughlai', 'Desserts'],
        location: { type: 'Point', coordinates: [78.4746, 17.3616] }, // Charminar
        address: { street: 'Charminar Cross Roads', city: 'Hyderabad', state: 'Telangana', zipCode: '500002' },
        menu: [
          { name: 'Fruit Biscuit (400g)', price: 250, category: 'Bakery', description: 'Classic crunchy Osmania biscuits.' }
        ],
        rating: { average: 4.8, count: 6200 },
        isVerified: true
      }
    ];

    for (const res of sampleRestaurants) {
      // Manually calculate slug because findOneAndUpdate doesn't trigger pre-save hooks
      const tempId = new mongoose.Types.ObjectId();
      const slug = res.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        + '-' + tempId.toString().slice(-6);

      await Restaurant.findOneAndUpdate(
        { name: res.name, merchantId: merchant._id },
        { ...res, slug },
        { upsert: true, new: true, runValidators: true }
      );
    }

    console.log('[Seed] Database seeded successfully ✓');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err.message);
    process.exit(1);
  }
};

seedData();
