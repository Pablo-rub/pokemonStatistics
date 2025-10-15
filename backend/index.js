/**
 * Entry Point for Google Cloud Functions (Gen 2)
 * 
 * This file registers HTTP-triggered Cloud Functions using the Functions Framework.
 * The framework automatically handles PORT binding and HTTP server initialization.
 */

const functions = require('@google-cloud/functions-framework');
const { fetchReplaysDaily } = require('./fetchReplaysDeploy');

// Register the HTTP function for Cloud Functions
// The Functions Framework will automatically:
// 1. Create an HTTP server
// 2. Listen on process.env.PORT (default: 8080)
// 3. Route requests to the registered function
functions.http('fetchReplaysDaily', fetchReplaysDaily);

// Note: DO NOT call app.listen() or create your own server here
// The Functions Framework handles all server initialization automatically