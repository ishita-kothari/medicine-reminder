/**
 * api/send-sms.js  —  Vercel Serverless Function
 *
 * WHY: Mobile apps cannot send SMS silently without a server because
 * Twilio credentials must never be embedded in client code (anyone who
 * decompiles the APK/IPA would find them). This thin proxy sits between
 * the app and Twilio's REST API, keeping credentials server-side.
 *
 * DEPLOY:
 *   1. Push this repo to GitHub
 *   2. Import to Vercel at vercel.com/new
 *   3. Add environment variables (see .env.example)
 *   4. Copy the deployment URL into the app's Alert Settings screen
 *
 * ENVIRONMENT VARIABLES (set in Vercel dashboard):
 *   TWILIO_ACCOUNT_SID   — from console.twilio.com
 *   TWILIO_AUTH_TOKEN    — from console.twilio.com
 *   TWILIO_PHONE_NUMBER  — your Twilio number e.g. +15005550006
 *   ALLOWED_ORIGIN       — your app's bundle ID or "*" for development
 *
 * REQUEST:  POST /api/send-sms
 *   Body: { "to": "+919428201825", "message": "Missed dose alert..." }
 *
 * RESPONSE: { "success": true, "sid": "SM..." }
 *           { "success": false, "error": "..." }
 */

const https = require('https');

module.exports = async function handler(req, res) {
  // CORS — allow the mobile app's origin
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to and message are required' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({
      success: false,
      error: 'Twilio credentials not configured on server',
    });
  }

  const result = await sendTwilioSMS({ accountSid, authToken, from, to, body: message });

  if (result.success) {
    return res.status(200).json({ success: true, sid: result.sid });
  } else {
    return res.status(502).json({ success: false, error: result.error });
  }
};

/**
 * Direct Twilio REST API call using Node's built-in https module.
 * No twilio npm package needed — keeps the serverless function lightweight.
 */
function sendTwilioSMS({ accountSid, authToken, from, to, body }) {
  return new Promise((resolve) => {
    const data = new URLSearchParams({ To: to, From: from, Body: body }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (twilioRes) => {
      let raw = '';
      twilioRes.on('data', (chunk) => { raw += chunk; });
      twilioRes.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (twilioRes.statusCode >= 200 && twilioRes.statusCode < 300) {
            resolve({ success: true, sid: json.sid });
          } else {
            resolve({ success: false, error: json.message || 'Twilio error' });
          }
        } catch {
          resolve({ success: false, error: 'Invalid Twilio response' });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(data);
    req.end();
  });
}
