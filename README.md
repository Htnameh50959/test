# Integrated Food Delivery and Dine-Out Hospitality Platform

An all-in-one hospitality ecosystem consolidating food delivery, restaurant reservations, and live event discovery into a unified platform with advanced AI-powered features and real-time tracking.

## 🎯 Project Overview

This platform eliminates digital fragmentation by combining three hospitality verticals into a seamless user experience:
- **Food Delivery**: Geospatial search with sub-200ms response times
- **Restaurant Reservations**: Table booking with real-time availability
- **Event Discovery**: Live event ticketing and browsing
- **Gamified Reviews**: AI-assisted, detailed review system with loyalty rewards

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Implementation Timeline](#implementation-timeline)
- [Development Guidelines](#development-guidelines)

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js 5.x
- **Database**: MongoDB (Atlas recommended for production)
- **Authentication**: JWT + bcryptjs
- **Caching**: In-memory cache (Redis-ready architecture)
- **Real-time**: Socket.io
- **NLP**: Natural.js (keyword extraction & sentiment analysis)
- **Validation**: Joi
- **Security**: Helmet, CORS

### Frontend
- **Framework**: React 19 with Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v7
- **Maps**: Leaflet + React-Leaflet
- **HTTP Client**: Axios
- **Form Handling**: Formik + Yup
- **Real-time**: Socket.io-client

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── controllers/           # Business logic
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── restaurants.js
│   │   │   ├── orders.js
│   │   │   ├── reviews.js
│   │   │   ├── merchant.js
│   │   │   ├── cart.js
│   │   │   └── events.js
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.js            # JWT & role-based access
│   │   │   ├── error.js           # Error handling
│   │   │   └── validate.js        # Request validation
│   │   ├── models/                # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Restaurant.js
│   │   │   ├── Order.js
│   │   │   ├── Review.js
│   │   │   ├── Cart.js
│   │   │   └── Event.js
│   │   ├── routes/                # API routes
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── restaurants.js
│   │   │   ├── orders.js
│   │   │   ├── reviews.js
│   │   │   ├── merchant.js
│   │   │   ├── cart.js
│   │   │   └── events.js
│   │   ├── services/              # Business services
│   │   ├── utils/
│   │   │   ├── cache.js           # Caching utilities
│   │   │   ├── errorResponse.js   # Error handling helpers
│   │   │   ├── paymentGateway.js  # Mock payment processor
│   │   │   └── seeder.js          # Database seeding
│   │   └── server.js              # Express app setup
│   ├── .env                       # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable React components
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── checkout/
│   │   │   ├── discovery/
│   │   │   ├── landing/
│   │   │   ├── merchant/
│   │   │   └── orders/
│   │   ├── services/
│   │   │   ├── api.js             # API client
│   │   │   └── socket.js          # Socket.io client
│   │   ├── store/                 # Redux store
│   │   │   └── slices/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── theme.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── BACKEND_IMPLEMENTATION_PLAN.md # Detailed backend roadmap
├── PRD.md                         # Product Requirements
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **MongoDB** v5.0+ (local or Atlas)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd Integrated-Food-Delivery-and-Dine-Out-Hospitality-Platform
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Configure Environment Variables**
Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hospitality_platform
JWT_SECRET=your_super_secret_jwt_key_12345
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

4. **Start MongoDB**
```bash
# On Windows
net start MongoDB

# Or use MongoDB Compass GUI
```

5. **Seed Database** (Optional)
```bash
cd backend
npm run seeder
```

6. **Start Backend Server**
```bash
npm run dev    # Development with nodemon
# or
npm start      # Production mode
```

Backend will be available at `http://localhost:5000`

7. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/profile` | Get user profile (Protected) |
| PUT | `/api/v1/users/profile` | Update profile (Protected) |
| POST | `/api/v1/users/addresses` | Add delivery address (Protected) |
| DELETE | `/api/v1/users/addresses/:id` | Delete address (Protected) |

### Restaurants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/restaurants/search` | Search restaurants (geospatial) |
| GET | `/api/v1/restaurants/:id` | Get restaurant details |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create new order (Protected) |
| GET | `/api/v1/orders` | Get user/merchant orders (Protected) |
| GET | `/api/v1/orders/:id` | Get order details (Protected) |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cart` | Get cart (Protected) |
| POST | `/api/v1/cart/items` | Add item to cart (Protected) |
| DELETE | `/api/v1/cart/items/:id` | Remove item (Protected) |

### Merchant Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchant/dashboard` | Dashboard data (Merchant only) |
| PUT | `/api/v1/merchant/orders/:id/status` | Update order status (Merchant) |
| PUT | `/api/v1/merchant/menu/:id/availability` | Toggle menu item (Merchant) |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reviews` | Submit review (Protected) |
| GET | `/api/v1/restaurants/:id/reviews/analytics` | Review analytics |

## ✨ Features

### Phase 1: Foundation & Authentication ✅
- User registration & login with JWT
- Role-based access control (consumer, merchant, courier)
- Password hashing (bcrypt)
- Profile management
- Address management

### Phase 2: Geospatial Search & Orders ✅
- Geospatial restaurant search (<200ms response time)
- Redis caching for search results
- MongoDB 2dsphere indexing
- Order creation with validation
- Mock payment gateway (95% success rate)
- Order status tracking
- Order history

### Phase 3: Reviews & Gamification ✅
- AI-powered keyword extraction
- Sentiment analysis
- Review scoring algorithm
- Loyalty points system
- Restaurant rating aggregation
- Photo upload support

### Phase 4: Merchant Dashboard & Finalization
- Merchant dashboard with KPIs
- Real-time order management
- Menu availability control
- Analytics endpoints
- Comprehensive testing
- API documentation

## 📅 Implementation Timeline

See [BACKEND_IMPLEMENTATION_PLAN.md](./BACKEND_IMPLEMENTATION_PLAN.md) for detailed week-by-week breakdown:

- **Week 1**: Foundation & Database Architecture
- **Week 2**: Geospatial Search & Order System
- **Week 3**: Reviews & Advanced Features
- **Week 4**: API Finalization & Documentation

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Search Latency (P95) | <200ms |
| API Response Time | <500ms |
| Review Quality | ≥150 characters avg |
| Payment Success Rate | 95%+ |
| Test Coverage | >80% |

## 🔐 Security Features

- JWT authentication with expiration
- bcryptjs password hashing (10 rounds)
- Role-based authorization
- Input validation with Joi
- CORS protection
- Helmet security headers
- SQL injection prevention (MongoDB)
- Rate limiting ready

## 📝 Database Models

### User Schema
- email (unique)
- passwordHash
- role (consumer/merchant/courier)
- profile (name, phone, DOB, picture)
- addresses (GeoJSON points with 2dsphere index)
- loyaltyPoints
- timestamps

### Restaurant Schema
- name, description
- cuisineTypes
- location (GeoJSON Point with 2dsphere index)
- rating (average, count)
- menu (items with prices, categories)
- hours
- deliveryFee, minimumOrder
- isActive flag

### Order Schema
- orderNumber (unique)
- customerId, restaurantId
- items (with quantities, prices)
- status (state machine: PENDING → DELIVERED)
- payment (method, amount breakdown)
- deliveryAddress
- specialInstructions
- statusHistory

### Review Schema
- orderId (unique)
- customerId, restaurantId
- rating, text, photos
- keywords (extracted via NLP)
- sentiment (score -1 to 1, label)
- qualityScore, pointsAwarded
- categoryRatings (food, service, ambiance, value)

## 🚀 Deployment

### Backend Deployment
```bash
# Set NODE_ENV=production in .env
NODE_ENV=production npm start
```

### Frontend Build
```bash
npm run build
npm run preview
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📄 License

ISC

## 👥 Team

**Member 1: Backend Core & Database Architect**
- Database design & implementation
- Core API development
- Authentication & authorization
- Geospatial search engine
- Payment processing
- Order management system

## 📞 Support

For issues or questions, please open a GitHub issue or contact the development team.

---

**Last Updated**: April 10, 2026  
**Status**: In Development (Phase 3 Complete)