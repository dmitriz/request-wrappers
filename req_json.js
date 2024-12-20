const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Generic JSON request wrapper using continuation passing style with currying
 * @param {Object} params - Configuration object for the request
 * @param {string} params.url - The URL to send the request to
 * @param {string} [params.method='GET'] - HTTP method (GET, POST, etc.)
 * @param {Object} [params.headers={}] - Request headers
 * @param {Object} [params.body={}] - Request body (for POST, PUT, etc.)
 * @param {number} [params.timeout=5000] - Request timeout in milliseconds
 * @returns {function} A function that takes success and error callbacks
 */
const req_json = (params) => (onSuccess, onError) => {
  // Set default values
  const {
    url,
    method = 'GET', 
    headers = {},
    body = {},
    timeout = 5000
  } = params;

  // Parse URL to determine protocol
  const parsedUrl = new URL(url);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  // Prepare request options
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  // Prepare request body 
  const requestBody = JSON.stringify(body);
  requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody);

  // Create the request
  const req = protocol.request(url, requestOptions, (res) => {
    let responseBody = '';

    // Accumulate response data
    res.on('data', (chunk) => {
      responseBody += chunk;
    });

    // Handle complete response
    res.on('end', () => {
      try {
        // Try to parse JSON response
        const parsedResponse = responseBody ? JSON.parse(responseBody) : {};
        onSuccess({
          status: res.statusCode,
          headers: res.headers,
          body: parsedResponse
        });
      } catch (parseError) {
        onError({
          type: 'ParseError',
          error: parseError,
          rawResponse: responseBody
        });
      }
    });
  });

  // Handle request errors
  req.on('error', (error) => {
    onError({
      type: 'RequestError',
      error
    });
  });

  // Set timeout
  req.setTimeout(timeout, () => {
    req.destroy();
    onError({
      type: 'TimeoutError',
      error: new Error('Request timed out')
    });
  });

  // Write body 
  req.write(requestBody);

  // End the request
  req.end();
};

// Example usage
module.exports = req_json;

// Example of how to use the wrapper
/*
const makeRequest = req_json({
  url: 'https://api.example.com/data',
  method: 'POST',
  body: { key: 'value' }
});

makeRequest(
  (successResponse) => {
    console.log('Success:', successResponse);
  },
  (errorResponse) => {
    console.error('Error:', errorResponse);
  }
);
*/
