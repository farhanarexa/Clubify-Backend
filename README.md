# ClubShare Backend

The backend for ClubShare is a comprehensive Node.js API that handles user authentication, club management, event creation, and data persistence. It uses MongoDB for data storage and integrates with Firebase for authentication.

## Features

- **User Authentication**: Secure JWT-based authentication system
- **Role-based Access Control**: Different permissions for User, Club Manager, and Admin roles
- **Club Management**: Create, update, delete, and manage clubs
- **Event Management**: Handle event creation, registration, and management
- **Payment Integration**: Handle club membership and event payment processing
- **File Upload**: Secure image uploads using Multer
- **Data Validation**: Comprehensive input validation using middleware
- **Error Handling**: Robust error handling and response formatting

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, Firebase integration
- **File Upload**: Multer
- **Environment Variables**: Dotenv
- **HTTP Client**: Axios
- **Security**: Helmet, Cors, Express-rate-limit

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd clubify-backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clubify
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

4. Start the development server
```bash
npm start
```

## Environment Variables

- `PORT`: Port number for the server (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `NODE_ENV`: Environment mode (development/production)
- `CLIENT_URL`: URL of the frontend application for CORS

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `POST /api/users/logout` - Logout user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Clubs
- `GET /api/clubs` - Get all clubs
- `GET /api/clubs/:id` - Get specific club
- `POST /api/clubs` - Create new club
- `PUT /api/clubs/:id` - Update club
- `DELETE /api/clubs/:id` - Delete club

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Process new payment

### Users (Admin only)
- `GET /api/users` - Get all users
- `PUT /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

## Database Schema

### User Schema
- `_id`: ObjectId
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String
- `role`: String (user, clubManager, admin)
- `isVerified`: Boolean
- `createdAt`: Date

### Club Schema
- `_id`: ObjectId
- `ownerId`: ObjectId (reference to User)
- `name`: String
- `description`: String
- `location`: String
- `category`: String
- `memberCount`: Number (default: 0)
- `imageUrl`: String
- `isApproved`: Boolean (default: false)
- `createdAt`: Date

### Event Schema
- `_id`: ObjectId
- `clubId`: ObjectId (reference to Club)
- `title`: String
- `description`: String
- `date`: Date
- `location`: String
- `price`: Number
- `imageUrl`: String
- `registrationCount`: Number (default: 0)
- `createdAt`: Date

## Security Measures

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configured for secure cross-origin requests
- **Helmet**: Security headers for Express apps
- **Password Hashing**: BCrypt for secure password storage

## Deployment

1. Set environment variables for production
2. Ensure MongoDB is accessible in production environment
3. Use a process manager like PM2 for production deployment:
```bash
npm install -g pm2
pm2 start server.js
```

## API Documentation

All API endpoints return JSON responses. Error responses follow the format:
```json
{
  "error": "Error message"
}
```

Success responses follow the format:
```json
{
  "message": "Success message",
  "data": { ... }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License