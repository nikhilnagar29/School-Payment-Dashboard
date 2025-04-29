# School Payment & Dashboard System

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
