# School Payment & Dashboard System

A comprehensive payment management and dashboard system for schools and educational institutions. This system allows schools to create payment links, track transactions, and manage student payments efficiently.

## Table of Contents

- [Features](#features)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
  - [Authentication API](#authentication-api)
  - [User Management API](#user-management-api)
  - [Payment API](#payment-api)
  - [Transaction API](#transaction-api)
- [Deployment](#deployment)
- [Testing](#testing)

## Features

- Payment gateway integration with Edviron
- Payment link generation for students
- Transaction tracking and status monitoring
- Comprehensive reporting and analytics
- Role-based access control
- Webhook handling for real-time payment updates

## Setup & Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables (see below)
4. Start the server:
   ```
   npm start
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URL=mongodb://localhost:27017/school-payment-system

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret
SERVER_URL=http://localhost:5000
```

## API Documentation

### Authentication API

#### Register User

- **URL**: `POST /api/auth/register`
- **Access**: Public
- **Description**: Register a new user (admin/trustee)
- **Request Body**:
  ```json
  {
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password",
    "role": "admin", // admin or trustee
    "school_id": ["school_1", "school_2"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "jwt_token_here"
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "error": "User already exists"
  }
  ```

#### Login User

- **URL**: `POST /api/auth/login`
- **Access**: Public
- **Description**: Authenticate and login a user
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "jwt_token_here"
  }
  ```
- **Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "error": "Invalid credentials"
  }
  ```

#### Get Current User

- **URL**: `GET /api/auth/me`
- **Access**: Private (Requires Authentication)
- **Description**: Get currently logged in user details
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "user_id",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
      "schools": []
    }
  }
  ```
- **Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "error": "Not authorized, no token"
  }
  ```

### User Management API

#### Get All Users

- **URL**: `GET /api/users`
- **Access**: Private/Admin
- **Description**: Get a list of all users
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "user_id_1",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "schools": ["school_ids"]
    },
    {
      "id": "user_id_2",
      "name": "Trustee User",
      "email": "trustee@example.com",
      "role": "trustee",
      "schools": ["school_ids"]
    }
  ]
  ```

#### Get User by ID

- **URL**: `GET /api/users/:id`
- **Access**: Private/Admin
- **Description**: Get details of a specific user
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "schools": ["school_ids"]
  }
  ```
- **Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "error": "User not found"
  }
  ```

#### Update User

- **URL**: `PUT /api/users/:id`
- **Access**: Private/Admin
- **Description**: Update a user's information
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Request Body**:
  ```json
  {
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "trustee"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "user_id",
      "name": "Updated Name",
      "email": "updated@example.com",
      "role": "trustee"
    }
  }
  ```

#### Delete User

- **URL**: `DELETE /api/users/:id`
- **Access**: Private/Admin
- **Description**: Delete a user
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User deleted"
  }
  ```

### Payment API

#### Create Payment Link

- **URL**: `POST /api/payments/create-payment`
- **Access**: Private/Admin/Trustee
- **Description**: Create a new payment link for a student
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Request Body**:
  ```json
  {
    "student_info": {
      "names": "student",
      "id": "student_id",
      "email": "student@example.com"
    },
    "school_id": "school_id_here",
    "order_amount": 1000
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "collect_request_id": "ORDER-101",
    "payment_link": "https://dev-payments.edviron.com/edviron-pg"
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "success": false,
    "error": "Invalid payment details"
  }
  ```

#### Get Payment Link Details

- **URL**: `GET /api/payments/:id`
- **Access**: Private/Admin/Trustee
- **Description**: Get details of a specific payment link
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "order": {
      "_id": "order_id",
      "custom_order_id": "ORDER-101",
      "school_id": "school_id_here",
      "student_info": {
        "email": "student@example.com",
        "names": "John Doe",
        "id": "STU101",
        "class": "10A",
        "roll_number": "101"
      },
      "amount": 1000,
      "description": "Annual fee payment",
      "gateway_name": "razorpay",
      "payment_link": "https://razorpay.com/payment/link_id",
      "createdAt": "2023-06-15T10:00:00.000Z"
    }
  }
  ```
- **Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "error": "Payment link not found"
  }
  ```

#### Webhook Handler

- **URL**: `POST /api/payments/webhook`
- **Access**: Public (with webhook secret)
- **Description**: Handles payment gateway webhooks for status updates
- **Headers**:
  ```
  x-razorpay-signature: webhook_signature_here
  ```
- **Request Body (Edviron Format)**:
  ```json
  {
    "EdvironCollectRequestId": "collect_id_here",
    "status": "SUCCESS",
    "amount": "1000",
    "payment_mode": "UPI",
    "transaction_id": "txn_id_here"
  }
  ```
- **Request Body (Legacy Format)**:
  ```json
  {
    "order_info": {
      "order_id": "collect_id_here",
      "status": "success",
      "order_amount": 1000,
      "transaction_amount": 1000,
      "payment_mode": "UPI",
      "payment_details": "upi_id@ybl",
      "bank_reference": "BANK001",
      "Payment_message": "payment success",
      "payment_time": "2023-06-15T10:00:00.000Z"
    }
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment status updated"
  }
  ```
- **Response (Error Handling)**:
  ```json
  {
    "success": false,
    "error": "Error type",
    "message": "Detailed error message"
  }
  ```

#### Webhook Handler (GET - Query Parameter Support)

- **URL**: `GET /api/payments/webhook?EdvironCollectRequestId=collect_id_here&status=SUCCESS&amount=1000`
- **Access**: Public
- **Description**: Alternative webhook handler that supports query parameters for gateways that use GET requests
- **Query Parameters**:
  - `EdvironCollectRequestId`: (Required) Collection/Order ID
  - `status`: (Required) Payment status ("SUCCESS", "PENDING", "FAILED")
  - `amount`: Transaction amount
  - `payment_mode`: Payment method used
  - `transaction_id`: Transaction reference ID
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment status updated"
  }
  ```
- **Example URL**:
  ```
  https://school-payment-dashboard-1.onrender.com/api/payments/webhook?EdvironCollectRequestId=68112450d155691054fe68f7&status=SUCCESS&amount=1000
  ```

#### Test Webhook

- **URL**: `GET /api/payments/test-webhook`
- **Access**: Private/Admin
- **Description**: Tests the webhook integration by sending a test payload
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Test webhook sent successfully",
    "details": {
      "post_attempt": true,
      "post_status": "success",
      "fallback_attempt": false,
      "webhook_url": "http://example.com/api/payments/webhook"
    }
  }
  ```

### Transaction API

#### Get All Transactions

- **URL**: `GET /api/transactions`
- **Access**: Private/Admin/Trustee
- **Description**: Get all transactions with optional status filtering
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Query Parameters**:
  - `status`: Filter by status (success, pending, failed)
- **Response (200 OK)**:
  ```json
  [
    {
      "collect_id": "order_id_1",
      "school_id": "school_id_1",
      "gateway": "razorpay",
      "order_amount": 1000,
      "transaction_amount": 1000,
      "status": "success",
      "custom_order_id": "ORDER-101",
      "payment_mode": "UPI",
      "payment_time": "2023-06-15T10:30:00.000Z",
      "bank_reference": "BANK001"
    },
    {
      "collect_id": "order_id_2",
      "school_id": "school_id_1",
      "gateway": "razorpay",
      "order_amount": 2000,
      "transaction_amount": 0,
      "status": "failed",
      "custom_order_id": "ORDER-102",
      "payment_mode": "CARD",
      "payment_time": "2023-06-16T11:30:00.000Z",
      "bank_reference": "BANK002"
    }
  ]
  ```

#### Get Transaction Summary

- **URL**: `GET /api/transactions/summary`
- **Access**: Private/Admin/Trustee
- **Description**: Get transaction summary statistics
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "summary": [
      {
        "status": "success",
        "count": 10,
        "totalAmount": 10000,
        "percentage": "50.00"
      },
      {
        "status": "pending",
        "count": 5,
        "totalAmount": 5000,
        "percentage": "25.00"
      },
      {
        "status": "failed",
        "count": 5,
        "totalAmount": 0,
        "percentage": "25.00"
      }
    ],
    "totals": {
      "totalTransactions": 20,
      "totalAmount": 15000,
      "successRate": "50.00"
    }
  }
  ```

#### Get Transaction by ID

- **URL**: `GET /api/transactions/:id`
- **Access**: Private/Admin/Trustee
- **Description**: Get details of a specific transaction
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "transaction_id",
    "collect_id": "order_id",
    "school_id": "school_id",
    "gateway": "razorpay",
    "student_info": {
      "email": "student@example.com",
      "names": "John Doe",
      "id": "STU101",
      "class": "10A",
      "roll_number": "101"
    },
    "order_amount": 1000,
    "transaction_amount": 1000,
    "status": "success",
    "custom_order_id": "ORDER-101",
    "payment_mode": "UPI",
    "payment_time": "2023-06-15T10:30:00.000Z",
    "payment_details": {
      "upi_id": "student@upi",
      "transaction_ref": "TX001"
    },
    "bank_reference": "BANK001",
    "payment_message": "Payment successful",
    "error_message": null,
    "payment_link": "https://razorpay.com/payment/link_id"
  }
  ```
- **Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "error": "Transaction not found"
  }
  ```

#### Get Transactions by School

- **URL**: `GET /api/transactions/school/:schoolId`
- **Access**: Private/Admin/Trustee
- **Description**: Get all transactions for a specific school
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Query Parameters**:
  - `status`: Filter by status (success, pending, failed)
  - `page`: Page number for pagination (default: 1)
  - `limit`: Results per page (default: 10)
- **Response (200 OK)**:
  ```json
  {
    "transactions": [
      {
        "collect_id": "order_id_1",
        "order_amount": 1000,
        "transaction_amount": 1000,
        "status": "success",
        "payment_mode": "UPI",
        "payment_time": "2023-06-15T10:30:00.000Z",
        "bank_reference": "BANK001",
        "custom_order_id": "ORDER-101",
        "student_info": {
          "email": "student1@example.com",
          "names": "John Doe",
          "id": "STU101",
          "class": "10A",
          "roll_number": "101"
        }
      },
      {
        "collect_id": "order_id_2",
        "order_amount": 2000,
        "transaction_amount": 2000,
        "status": "pending",
        "payment_mode": "CARD",
        "payment_time": "2023-06-16T11:30:00.000Z",
        "bank_reference": "BANK002",
        "custom_order_id": "ORDER-102",
        "student_info": {
          "email": "student2@example.com",
          "names": "Jane Smith",
          "id": "STU102",
          "class": "10B",
          "roll_number": "102"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 25
    }
  }
  ```

#### Check Transaction Status

- **URL**: `GET /api/transactions/status/:custom_order_id`
- **Access**: Private/Admin/Trustee
- **Description**: Check status of a transaction by custom order ID
- **Headers**:
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "transaction": {
      "custom_order_id": "ORDER-101",
      "status": "success",
      "payment_time": "2023-06-15T10:30:00.000Z",
      "payment_mode": "UPI",
      "transaction_amount": 1000,
      "payment_message": "Payment successful",
      "error_message": null,
      "bank_reference": "BANK001"
    }
  }
  ```
- **Response (404 Not Found)**:
  ```json
  {
    "success": false,
    "error": "Order not found"
  }
  ```

## Deployment

### Deploying to Render

This application can be easily deployed to Render. Follow these steps:

1. Create a new Web Service in your Render dashboard
2. Link your GitHub repository
3. Configure the service:

   - **Name**: school-payment-dashboard (or your preferred name)
   - **Environment**: Node
   - **Region**: Choose your closest region
   - **Branch**: main (or your deployment branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or your preferred plan

4. Add the following environment variables in the Render dashboard:

   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URL=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=30d
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   WEBHOOK_SECRET=your_webhook_secret
   ```

5. Click "Create Web Service"

#### Troubleshooting Render Deployment

If you see the error "No open ports detected on 0.0.0.0", it means Render can't detect which port your application is listening on.

This application has been configured to:

- Listen on `0.0.0.0` (all interfaces) as required by Render
- Use the `PORT` environment variable that Render provides
- Have a proper `start` script in package.json

If you still encounter issues:

1. Check that app.js is binding to `0.0.0.0` and using the PORT environment variable
2. Verify that the start command in Render is set to `npm start`
3. Check the logs in Render for specific error messages

## Testing

### Manual Testing with Postman

1. Import the Postman collection from `docs/School_Payment_System.postman_collection.json`
2. Set up your environment variables:
   - `baseUrl`: Your API base URL (e.g., `http://localhost:5000/api`)
   - `authToken`: JWT token from login response

### Webhook Testing

For local webhook testing:

1. Use ngrok to expose your local server:

   ```
   npm run webhook-server
   ```

   This starts both your Express server and an ngrok tunnel.

2. Use the test webhook endpoint to trigger a test webhook:

   ```
   GET /api/payments/test-webhook
   ```

3. Check logs to confirm webhook delivery and processing

# School Payment & Dashboard System - Backend

## Transaction API Documentation

The Transaction API provides endpoints to fetch and manage payment transactions in the system.

### Setup and Configuration

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
   Create a `.env` file with the following variables:

```
MONGO_URI=mongodb://localhost:27017/school-payment-system
PORT=5000
JWT_SECRET=your_jwt_secret
```

3. Seed test data:

```bash
node scripts/seedTransactions.js
```

### Available Endpoints

#### 1. Fetch Transactions with Pagination and Filtering

- **Endpoint:** `GET /api/transactions`
- **Access:** Private (Admin, Trustee)
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Number of items per page (default: 10)
  - `status`: Filter by status (success, pending, failed)

**Example Requests:**

```
GET /api/transactions
GET /api/transactions?page=2&limit=15
GET /api/transactions?status=success
GET /api/transactions?page=1&limit=10&status=failed
```

**Response Format:**

```json
{
  "data": [
    {
      "collect_id": "60d21b4667d0d8992e610c85",
      "school_id": "60d21b4667d0d8992e610c80",
      "gateway": "PhonePe",
      "order_amount": 15000,
      "transaction_amount": 15000,
      "status": "success",
      "custom_order_id": "ORD-1624356932-1",
      "payment_mode": "UPI",
      "payment_time": "2023-06-22T10:30:45.000Z",
      "bank_reference": "UPITX123456789"
    }
    // More transaction objects...
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### 2. Get Transaction Summary Statistics

- **Endpoint:** `GET /api/transactions/summary`
- **Access:** Private (Admin, Trustee)

**Response Format:**

```json
{
  "summary": [
    {
      "status": "success",
      "count": 35,
      "totalAmount": 525000,
      "percentage": "70.00"
    },
    {
      "status": "pending",
      "count": 10,
      "totalAmount": 150000,
      "percentage": "20.00"
    },
    {
      "status": "failed",
      "count": 5,
      "totalAmount": 75000,
      "percentage": "10.00"
    }
  ],
  "totals": {
    "totalTransactions": 50,
    "totalAmount": 750000,
    "successRate": "70.00"
  }
}
```

#### 3. Get Transaction by ID

- **Endpoint:** `GET /api/transactions/:id`
- **Access:** Private (Admin, Trustee)

**Response Format:**

```json
{
  "id": "60d21b4667d0d8992e610c86",
  "collect_id": "60d21b4667d0d8992e610c85",
  "school_id": "60d21b4667d0d8992e610c80",
  "gateway": "PhonePe",
  "student_info": {
    "names": "Student Name",
    "id": "ST10001",
    "email": "student@example.com"
  },
  "order_amount": 15000,
  "transaction_amount": 15000,
  "status": "success",
  "custom_order_id": "ORD-1624356932-1",
  "payment_mode": "UPI",
  "payment_time": "2023-06-22T10:30:45.000Z",
  "payment_details": "UPI transaction",
  "bank_reference": "UPITX123456789",
  "payment_message": "Payment successful",
  "error_message": null,
  "payment_link": "https://pay.example.com/ORD-1624356932-1"
}
```

### Data Models Relationship

The Transaction API combines data from two MongoDB collections:

1. **Orders** - Contains order information
2. **OrderStatus** - Contains payment status information linked to orders

Relationship:

- `OrderStatus.collect_id` references `Order._id`
- `Order.custom_order_id` is the unique order identifier

### Efficiency Considerations

1. **Indexing**: The MongoDB collections have indexes on frequently queried fields for faster lookups
2. **Pagination**: The API uses skip/limit for efficient pagination of large result sets
3. **Sorting**: Results are sorted by payment_time (descending) for most recent transactions first
4. **Projection**: Only required fields are returned to minimize payload size
5. **Aggregation Pipeline**: Uses MongoDB's efficient aggregation pipeline for joining collections

## Server Keep-Alive Functionality

The application includes functionality to prevent your server from going to sleep on platforms like Render.com that put free/hobby tier instances to sleep after periods of inactivity.

### Option 1: Self-Ping (Built into the app)

The app can ping itself at regular intervals to keep itself awake. To enable this:

1. Set the following environment variables in your `.env` file:

   ```
   ENABLE_SELF_PING=true
   PING_URL="https://your-app-url.onrender.com/ping"
   PING_INTERVAL=5  # minutes
   ```

2. The app will automatically ping itself at the specified interval.

### Option 2: Standalone Keep-Alive Script

You can also run a separate script to ping your server:

```bash
node keepAlive.js [url] [interval_in_minutes]
```

Example:

```bash
node keepAlive.js https://your-app-url.onrender.com 15
```

This is useful if you want to run the keep-alive service on a different machine or with a process manager like PM2.

### Option 3: AWS Lambda Function

For a more reliable solution, you can deploy the provided Lambda function to AWS:

1. Create a new Lambda function in AWS
2. Upload the code from `lambda/pingFunction.js`
3. Set up a CloudWatch Events rule to trigger the Lambda every 5-15 minutes
4. Update the `SERVER_URL` in the function to point to your application

This is the most reliable option as AWS Lambda has a generous free tier and high reliability.

### Which Option Should I Choose?

- **Option 1 (Self-Ping)**: Simplest to set up, but if your app goes to sleep, it can't wake itself up.
- **Option 2 (Standalone Script)**: Good if you have another server that's always running.
- **Option 3 (AWS Lambda)**: Most reliable option, recommended for production.
