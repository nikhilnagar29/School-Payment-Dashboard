/**
 * AWS Lambda function to ping a server at scheduled intervals
 * 
 * This function can be deployed to AWS Lambda and triggered by CloudWatch Events
 * to keep your Render.com server active.
 * 
 * Setup instructions:
 * 1. Create a Lambda function in AWS with NodeJS runtime
 * 2. Upload this file or copy its contents to the Lambda function
 * 3. Set up a CloudWatch Event trigger to run every 5-15 minutes
 * 4. Update the URL below to your actual server URL
 */

const https = require('https');
const http = require('http');

// Configure the server URL here
const SERVER_URL = 'https://your-app-url.onrender.com/ping';

exports.handler = async (event, context) => {
  console.log(`Lambda function invoked at ${new Date().toISOString()}`);
  console.log(`Pinging server at ${SERVER_URL}`);
  
  try {
    const response = await pingServer(SERVER_URL);
    console.log('Ping response:', response);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Server pinged successfully',
        timestamp: new Date().toISOString(),
        response: response
      })
    };
  } catch (error) {
    console.error('Ping failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Server ping failed',
        timestamp: new Date().toISOString(),
        error: error.message
      })
    };
  }
};

/**
 * Function to ping a server and return its response
 */
function pingServer(url) {
  return new Promise((resolve, reject) => {
    // Determine protocol (http or https)
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      // Check status code
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Server returned status code ${res.statusCode}`));
        return;
      }
      
      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Resolve with response when complete
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    // Handle errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout to prevent hanging
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out after 10 seconds'));
    });
    
    req.end();
  });
} 