import test from 'ava';
import req_json from '../../src/req_json'; // Update the path as needed
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const REAL_API_URL = process.env.REAL_API_URL; // e.g., "https://jsonplaceholder.typicode.com/posts"
const API_KEY = process.env.API_KEY; // Optional, if the API requires authentication

test('should make a successful GET request to a real API', async (t) => {
  const request = req_json({
    url: `${REAL_API_URL}/1`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  await new Promise((resolve, reject) => {
    request(
      (response) => {
        t.is(response.status, 200); // Verify HTTP status
        t.truthy(response.body); // Ensure the body contains data
        resolve();
      },
      (error) => reject(error)
    );
  });
});

test('should handle a 404 response from the real API', async (t) => {
  const request = req_json({
    url: `${REAL_API_URL}/invalid`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  await new Promise((resolve) => {
    request(
      () => t.fail('Expected a 404 error'),
      (error) => {
        t.is(error.type, 'RequestError');
        t.is(error.error.code, 404); // Ensure the error code matches
        resolve();
      }
    );
  });
});

test('should make a successful POST request with a payload to the real API', async (t) => {
  const request = req_json({
    url: `${REAL_API_URL}`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: { title: 'foo', body: 'bar', userId: 1 },
  });

  await new Promise((resolve, reject) => {
    request(
      (response) => {
        t.is(response.status, 201); // Verify created response
        t.truthy(response.body.id); // Ensure the response contains an ID
        resolve();
      },
      (error) => reject(error)
    );
  });
});
