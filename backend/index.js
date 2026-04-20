import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import twilio from 'twilio';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

const {
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME = 'SafePass Navigator',
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '587',
  FRONTEND_URL = 'http://localhost:5173',
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER
} = process.env;

const twilioClient = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) 
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) 
  : null;

const emailOtpConfigured = Boolean(SMTP_USER && SMTP_PASS);

const transporter = emailOtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

app.use(cors());
app.use(express.json());

// MongoDB Schema
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: true },
  emergencyEmail: { type: String },
  emergencyContacts: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: String,
    phone: String,
    relationship: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const PendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const PendingContactOTPSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const ActiveJourneySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  journeyId: String,
  source: { lat: Number, lng: Number },
  destination: { lat: Number, lng: Number },
  checkpoints: [{
    id: String,
    lat: Number,
    lng: Number,
    name: String,
    deadline: Date,
    reached: Boolean
  }],
  currentCheckpointIndex: Number,
  missedCheckpoints: { type: Number, default: 0 },
  alertTriggered: { type: Boolean, default: false },
  lastKnownPosition: { lat: Number, lng: Number },
  lastPositionUpdate: Date,
  startedAt: Date,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const PendingSignup = mongoose.model('PendingSignup', PendingSignupSchema);
const PendingContactOTP = mongoose.model('PendingContactOTP', PendingContactOTPSchema);
const ActiveJourney = mongoose.model('ActiveJourney', ActiveJourneySchema);

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const sanitizeContacts = (contacts) => {
  if (!Array.isArray(contacts)) return [];
  return contacts
    .map((contact) => ({
      name: String(contact?.name || '').trim(),
      phone: String(contact?.phone || '').trim(),
      relationship: String(contact?.relationship || '').trim()
    }))
    .filter((contact) => contact.name && contact.phone);
};

const cleanupInvalidEmergencyContacts = async () => {
  const users = await User.find({ 'emergencyContacts.0': { $exists: true } }).select('_id emergencyContacts');
  let usersUpdated = 0;
  let contactsRemoved = 0;

  for (const user of users) {
    const original = Array.isArray(user.emergencyContacts) ? user.emergencyContacts : [];
    const cleaned = original
      .map((contact) => ({
        name: String(contact?.name || '').trim(),
        phone: String(contact?.phone || '').trim(),
        relationship: String(contact?.relationship || '').trim()
      }))
      .filter((contact) => contact.name && contact.phone);

    if (cleaned.length !== original.length) {
      contactsRemoved += (original.length - cleaned.length);
      user.emergencyContacts = cleaned;
      await user.save();
      usersUpdated += 1;
    }
  }

  if (usersUpdated > 0) {
    console.log(`[Cleanup] Removed ${contactsRemoved} invalid emergency contacts across ${usersUpdated} user(s)`);
  }
};

const sendEmailOtp = async (userEmail, otp) => {
  if (!transporter || !SMTP_USER) {
    throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS in backend .env.');
  }

  console.log(`Attempting to send email via ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);

  const messageHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9;">
        <h2 style="color: #333;">Welcome to our App!</h2>
        <p style="font-size: 16px; color: #555;">Please enter the following code to verify your email address:</p>
        <div style="margin: 20px auto; padding: 15px; background-color: #007bff; color: white; font-size: 24px; font-weight: bold; border-radius: 5px; width: fit-content; letter-spacing: 2px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #999;">This code will expire in 10 minutes.</p>
      </div>
    `;

  await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to: userEmail,
    subject: 'Verify your Registration',
    html: messageHtml
  });
  return 'smtp';
};

const sendContactOTPEmail = async (userEmail, otp) => {
  if (!transporter || !SMTP_USER) {
    throw new Error('SMTP not configured');
  }

  const messageHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9;">
      <h2 style="color: #333;">Update Emergency Contacts</h2>
      <p style="font-size: 16px; color: #555;">Please enter this OTP to update your emergency contacts:</p>
      <div style="margin: 20px auto; padding: 15px; background-color: #ef4444; color: white; font-size: 24px; font-weight: bold; border-radius: 5px; width: fit-content; letter-spacing: 2px;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #999;">This code will expire in 10 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to: userEmail,
    subject: 'Update Emergency Contacts - OTP',
    html: messageHtml
  });
};

const sendSMS = async (phoneNumber, message) => {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log(`[SMS] Would send to ${phoneNumber}: ${message}`);
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    console.log(`SMS sent to ${phoneNumber}`);
  } catch (err) {
    console.error(`Failed to send SMS: ${err.message}`);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await User.syncIndexes();
    await PendingSignup.syncIndexes();
    await cleanupInvalidEmergencyContacts();
    console.log('Successfully connected to MongoDB!');
  })
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Auth Routes
app.post('/api/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingSignup.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await sendEmailOtp(email, otp);
    return res.json({ message: `OTP sent to ${email}` });
  } catch (err) {
    const rawMessage = String(err?.message || '');
    const friendlyMessage = rawMessage.includes('Username and Password not accepted')
      ? 'Gmail rejected the SMTP credentials. Use a valid Google App Password with 2-step verification enabled.'
      : rawMessage.includes('demo domains can only be used')
        ? 'Mailtrap demo restrictions are no longer used. Configure a real SMTP account in backend .env.'
        : rawMessage;
    return res.status(500).json({
      message: friendlyMessage || 'Failed to send OTP via email provider'
    });
  }
});

app.post('/api/verify', async (req, res) => {
  const { fullName, email, password, otp } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const cleanFullName = String(fullName || '').trim();
  const cleanPassword = String(password || '');
  const cleanOtp = String(otp || '').trim();

  if (!cleanFullName || !normalizedEmail || !cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ message: 'Please provide full name, email, and a password with at least 6 characters' });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  try {
    const otpRecord = await PendingSignup.findOne({
      email: normalizedEmail,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
  } catch (err) {
    return res.status(400).json({ message: err?.message || 'OTP verification failed' });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    
    const user = new User({
      fullName: cleanFullName,
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: true,
      emergencyContacts: []
    });
    await user.save();
    await PendingSignup.deleteMany({ email: normalizedEmail });

    const { password: _, ...userData } = user.toObject();
    res.status(201).json(userData);
  } catch (err) {
    res.status(400).json({ message: err.message.includes('duplicate') ? 'User already exists' : err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  
  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    // Compare plaintext password with hashed password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const { password: _, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Emergency Contact Routes
app.post('/api/user/:userId/contacts', async (req, res) => {
  const { userId } = req.params;
  const contact = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [nextContact] = sanitizeContacts([contact]);
    if (!nextContact) {
      return res.status(400).json({ message: 'Contact name and phone are required' });
    }

    user.emergencyContacts.push(nextContact);
    await user.save();
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/user/:userId/contacts/:contactId', async (req, res) => {
  const { userId, contactId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.emergencyContacts = user.emergencyContacts.filter(c => c._id.toString() !== contactId);
    await user.save();
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// OTP for Emergency Contact Updates
app.post('/api/user/:userId/contacts/otp/send', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingContactOTP.findOneAndUpdate(
      { userId },
      { otp, expiresAt },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Security gate: always send OTP to account primary email.
    await sendContactOTPEmail(user.email, otp);

    res.json({ message: 'OTP sent to your primary account email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify OTP and Update Emergency Contacts
app.post('/api/user/:userId/contacts/otp/verify', async (req, res) => {
  const { userId } = req.params;
  const { otp, contacts, emergencyEmail } = req.body;

  try {
    const otpRecord = await PendingContactOTP.findOne({
      userId,
      otp: String(otp).trim(),
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const nextContacts = sanitizeContacts(contacts);
    if (nextContacts.length < 1) {
      return res.status(400).json({ message: 'At least one emergency contact is required' });
    }

    const nextEmergencyEmail = String(emergencyEmail || '').trim().toLowerCase();
    if (!nextEmergencyEmail || !isValidEmail(nextEmergencyEmail)) {
      return res.status(400).json({ message: 'A valid emergency email is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.emergencyContacts = nextContacts;
    user.emergencyEmail = nextEmergencyEmail;
    await user.save();
    await PendingContactOTP.deleteOne({ _id: otpRecord._id });

    res.json({
      message: 'Emergency contacts updated successfully',
      emergencyContacts: user.emergencyContacts,
      emergencyEmail: user.emergencyEmail
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Journey Tracking & Escalation Endpoints
app.post('/api/journey/start', async (req, res) => {
  const { userId, journeyId, source, destination, checkpoints } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user has at least one emergency contact
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({ message: 'At least one emergency contact is required to start a journey' });
    }

    const journey = new ActiveJourney({
      userId,
      journeyId,
      source,
      destination,
      checkpoints,
      currentCheckpointIndex: 0,
      startedAt: new Date(),
      active: true
    });
    await journey.save();
    res.json(journey);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/journey/update-position', async (req, res) => {
  const { userId, journeyId, position } = req.body;
  try {
    const journey = await ActiveJourney.findOne({ userId, journeyId });
    if (!journey) return res.status(404).json({ message: 'Journey not found' });

    journey.lastKnownPosition = position;
    journey.lastPositionUpdate = new Date();
    await journey.save();
    res.json({ message: 'Position updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Level 2 Alert: Send live tracking URL
app.post('/api/journey/alert/level2', async (req, res) => {
  const { userId, journeyId, checkpoint } = req.body;
  try {
    const user = await User.findById(userId);
    const journey = await ActiveJourney.findOne({ userId, journeyId });
    if (!user || !journey) return res.status(404).json({ message: 'User or journey not found' });

    const trackingToken = crypto.randomBytes(16).toString('hex');
    const trackingUrl = `${FRONTEND_URL}/track?token=${trackingToken}`;

    const message = `ALERT: ${user.fullName} missed checkpoint "${checkpoint.name}" at ${new Date(checkpoint.deadline).toLocaleTimeString()}. Live location: ${trackingUrl}`;

    // Email-only alert mode configured for this project.
    if (user.emergencyEmail) {
      await transporter?.sendMail({
        from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
        to: user.emergencyEmail,
        subject: 'SAFETY ALERT: Missed Checkpoint',
        html: `<p>${message}</p><p><a href="${trackingUrl}">View Live Location</a></p>`
      });
    }

    journey.missedCheckpoints = (journey.missedCheckpoints || 0) + 1;
    await journey.save();

    res.json({ message: 'Level 2 alert triggered', trackingUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Level 3 Alert: SOS
app.post('/api/journey/alert/level3', async (req, res) => {
  const { userId, journeyId, checkpoint } = req.body;
  try {
    const user = await User.findById(userId);
    const journey = await ActiveJourney.findOne({ userId, journeyId });
    if (!user || !journey) return res.status(404).json({ message: 'User or journey not found' });

    const sosMessage = `🚨 SOS ALERT 🚨\n${user.fullName} is unresponsive and off-track!\nLast known location: ${journey.lastKnownPosition?.lat}, ${journey.lastKnownPosition?.lng}\nDestination: ${journey.destination?.name || 'Unknown'}\nMissed checkpoints: ${journey.missedCheckpoints || 0}`;

    // Email-only alert mode configured for this project.
    if (user.emergencyEmail) {
      await transporter?.sendMail({
        from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
        to: user.emergencyEmail,
        subject: '🚨 SOS ALERT - User Unresponsive',
        html: `<pre style="white-space: pre-wrap;">${sosMessage}</pre>`
      });
    }

    journey.alertTriggered = true;
    await journey.save();

    res.json({ message: 'Level 3 SOS alert triggered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
