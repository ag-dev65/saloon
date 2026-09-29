require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_EMAIL = process.env.TARGET_EMAIL || 'godgiftonyewenu3@gmail.com';
const TARGET_WHATSAPP = process.env.TARGET_WHATSAPP || '+2349022790025';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function normalizeWhatsAppNumber(value, type) {
  const cleaned = String(value || '').trim();

  if (!cleaned) {
    throw new Error(`${type} is missing.`);
  }

  const withoutPrefix = cleaned.replace(/^whatsapp:/i, '').trim();
  const normalized = withoutPrefix.startsWith('+') ? withoutPrefix : `+${withoutPrefix}`;

  if (!/^\+[1-9]\d{4,14}$/.test(normalized)) {
    throw new Error(`${type} must be a valid WhatsApp number in international format.`);
  }

  return `whatsapp:${normalized}`;
}

function bookingSummary(booking) {
  return [
    'New Salon Booking Notification',
    '',
    `Customer: ${booking.fullName}`,
    `Phone: ${booking.phoneNumber}`,
    `Email: ${booking.emailAddress}`,
    `Service: ${booking.serviceName}`,
    `Preferred Date: ${booking.preferredDate}`,
    `Preferred Time: ${booking.preferredTime}`,
    `Reference: ${booking.reference}`,
    `Message: ${booking.additionalMessage || 'No additional message'}`,
  ].join('\n');
}

async function sendEmailNotification(booking) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: TARGET_EMAIL,
    subject: `New booking request: ${booking.serviceName} (${booking.reference})`,
    text: bookingSummary(booking),
    html: `<h3>New Booking Request</h3><pre>${bookingSummary(booking).replace(/\n/g, '<br>')}</pre>`,
  });
}

async function sendWhatsappNotification(booking) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio credentials are not configured.');
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = normalizeWhatsAppNumber(process.env.TWILIO_WHATSAPP_FROM, 'TWILIO_WHATSAPP_FROM');
  const toNumber = normalizeWhatsAppNumber(TARGET_WHATSAPP, 'TARGET_WHATSAPP');

  await client.messages.create({
    from: fromNumber,
    to: toNumber,
    body: bookingSummary(booking),
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Glow & Glam booking API is running.' });
});

app.post('/api/bookings', async (req, res) => {
  const booking = req.body;

  if (!booking || !booking.fullName || !booking.phoneNumber || !booking.emailAddress || !booking.serviceName || !booking.preferredDate || !booking.preferredTime) {
    return res.status(400).json({ success: false, error: 'Missing required booking fields.' });
  }

  const safeBooking = {
    ...booking,
    reference: booking.reference || `GGB-${Math.floor(10000 + Math.random() * 90000)}`,
    status: booking.status || 'Pending',
    additionalMessage: booking.additionalMessage || '',
  };

  let emailStatus = 'not-configured';
  let whatsappStatus = 'not-configured';

  try {
    await sendEmailNotification(safeBooking);
    emailStatus = 'sent';
  } catch (error) {
    console.error('Email notification failed:', error.message);
    emailStatus = 'failed';
  }

  try {
    await sendWhatsappNotification(safeBooking);
    whatsappStatus = 'sent';
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
    whatsappStatus = 'failed';
  }

  if (emailStatus === 'failed' && whatsappStatus === 'failed') {
    return res.status(500).json({
      success: false,
      reference: safeBooking.reference,
      error: 'Could not send notifications via email or WhatsApp.',
      emailStatus,
      whatsappStatus,
    });
  }

  return res.status(201).json({
    success: true,
    reference: safeBooking.reference,
    emailStatus,
    whatsappStatus,
  });
});

app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Glow & Glam booking API running on http://localhost:${PORT}`);
});
