// --- ERROR RESPONSE HELPER ---
// This file defines a simple way to create errors with status codes.
// It's like a custom 'Error' object that also knows about HTTP status (like 404 or 500).

class ErrorResponse extends Error {
  constructor(message, statusCode) {
    // Call the parent 'Error' class with the message.
    super(message);
    
    // Add our custom status code property.
    this.statusCode = statusCode;

    // This captures where the error happened in our code.
    Error.captureStackTrace(this, this.constructor);
  }
}

// Export the class so we can use it elsewhere.
module.exports = ErrorResponse;
