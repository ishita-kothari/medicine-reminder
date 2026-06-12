/**
 * api/send-email.js  —  Vercel Serverless Function
 *
 * WHY: Same reasoning as send-sms.js — API keys must stay server-side.
 * Uses Resend (resend.com) because it has a generous free tier (3,000
 * emails/month), a clean REST API, and excellent deliverability.
 *
 * ENVIRONMENT VARIABLES (set in Vercel dashboard):
 *   RESEND_API_KEY      — from resend.com/api-keys
 *   RESEND_FROM_EMAIL   — verified sender e.g. alerts@yourdomain.com
 *
 * REQUEST:  POST /api/send-email
 *   Body: {
 *     "to": "caregiver@example.com",
 *     "subject": "⚠️ Missed Dose Alert",
 *     "patientName": "Margaret",
 *     "medicationName": "Metformin",
 *     "minutesPastDue": 30,
 *     "urgency": "high",
 *     "message": "..."
 *   }
 *
 * RESPONSE: { "success": true, "id": "email_..." }
 *           { "success": false, "error": "..." }
 */

const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, subject, patientName, medicationName, minutesPastDue, urgency, message } =
    req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to and message are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@seniorcare.app';

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not configured' });
  }

  const urgencyEmoji = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' }[urgency] || '⚠️';
  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${urgency === 'critical' ? '#C62828' : urgency === 'high' ? '#E65100' : '#1A6B4A'};color:#FFF;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">${urgencyEmoji}</div>
    <h1 style="margin:0;font-size:24px">SeniorCare Alert</h1>
    <p style="margin:8px 0 0;opacity:0.9">${urgency?.toUpperCase()} URGENCY</p>
  </div>
  <div style="background:#F8F9FA;border-radius:12px;padding:20px;margin-bottom:20px">
    <h2 style="color:#1A1A1A;margin-top:0">Missed Dose Notification</h2>
    <p style="color:#4A4A4A;font-size:16px;line-height:1.6">${message}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      ${patientName ? `<tr><td style="padding:8px;color:#666;width:40%">Patient</td><td style="padding:8px;font-weight:bold">${patientName}</td></tr>` : ''}
      ${medicationName ? `<tr><td style="padding:8px;color:#666">Medication</td><td style="padding:8px;font-weight:bold">${medicationName}</td></tr>` : ''}
      ${minutesPastDue ? `<tr><td style="padding:8px;color:#666">Time overdue</td><td style="padding:8px;font-weight:bold">${minutesPastDue} minutes</td></tr>` : ''}
    </table>
  </div>
  <p style="color:#999;font-size:13px;text-align:center">
    Sent by SeniorCare Companion · This alert was triggered automatically because a medication dose was not confirmed.
  </p>
</body>
</html>`;

  const result = await sendResendEmail({
    apiKey,
    from: fromEmail,
    to,
    subject: subject || `${urgencyEmoji} Missed Dose: ${medicationName || 'Medication'}`,
    html: htmlBody,
    text: message,
  });

  if (result.success) {
    return res.status(200).json({ success: true, id: result.id });
  } else {
    return res.status(502).json({ success: false, error: result.error });
  }
};

function sendResendEmail({ apiKey, from, to, subject, html, text }) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ from, to, subject, html, text });
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (resendRes) => {
      let raw = '';
      resendRes.on('data', (c) => { raw += c; });
      resendRes.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
            resolve({ success: true, id: json.id });
          } else {
            resolve({ success: false, error: json.message || 'Resend error' });
          }
        } catch {
          resolve({ success: false, error: 'Invalid Resend response' });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}
