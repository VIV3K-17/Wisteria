import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

const {
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME = 'SafePass Navigator',
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '587'
} = process.env;

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
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String
  }]
});

const PendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const User = mongoose.model('User', UserSchema);
const PendingSignup = mongoose.model('PendingSignup', PendingSignupSchema);

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await User.syncIndexes();
    await PendingSignup.syncIndexes();
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
    
    user.emergencyContacts.push(contact);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
