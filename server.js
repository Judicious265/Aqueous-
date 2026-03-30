const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'data', 'users.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    plan: user.subscription?.status === 'active' ? 'premium' : 'free',
    subscription: user.subscription,
    freeTrialsToday: user.usage?.[todayKey()] || 0
  };
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const userId = sessions.get(token);

  if (!token || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Session invalid' });
  }

  req.user = user;
  req.db = db;
  req.token = token;
  next();
}

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const db = readDb();
  if (db.users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    usage: {},
    subscription: {
      status: 'inactive',
      planName: 'Premium',
      amountUSD: 12,
      termMonths: 3,
      startedAt: null,
      expiresAt: null,
      provider: 'PayChangu',
      paymentMethod: null
    },
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);

  return res.status(201).json({ message: 'Account created successfully. Please log in.' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const db = readDb();
  const user = db.users.find((u) => u.email === normalizedEmail);

  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);

  return res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

function humanizeText(text) {
  return text
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bmoreover\b/gi, 'also')
    .replace(/\btherefore\b/gi, 'so')
    .replace(/\bcommence\b/gi, 'start')
    .replace(/\bendeavor\b/gi, 'try');
}

function detectAiScore(text) {
  const aiPhrases = ['in conclusion', 'delve', 'leverage', 'multifaceted', 'furthermore'];
  const lower = text.toLowerCase();
  const matches = aiPhrases.filter((phrase) => lower.includes(phrase)).length;
  const longSentencePenalty = text.split('.').some((s) => s.trim().split(' ').length > 35) ? 0.15 : 0;
  const score = Math.min(0.95, 0.2 + matches * 0.15 + longSentencePenalty);
  return Number((score * 100).toFixed(1));
}

function enforceUsagePolicy(user) {
  const isPremium = user.subscription?.status === 'active' && new Date(user.subscription.expiresAt) > new Date();
  if (isPremium) {
    return { allowed: true, premium: true };
  }

  const key = todayKey();
  const count = user.usage?.[key] || 0;
  if (count >= 1) {
    return {
      allowed: false,
      premium: false,
      message: 'Daily free trial used. Upgrade to premium ($12 / 3 months) for unlimited use.'
    };
  }

  return { allowed: true, premium: false, dayKey: key };
}

function consumeTrial(user, db, dayKey) {
  user.usage = user.usage || {};
  user.usage[dayKey] = (user.usage[dayKey] || 0) + 1;
  writeDb(db);
}

app.post('/api/tools/humanize', auth, (req, res) => {
  const { text } = req.body;
  if (!text || String(text).trim().length < 15) {
    return res.status(400).json({ error: 'Please provide at least 15 characters of text.' });
  }

  const usage = enforceUsagePolicy(req.user);
  if (!usage.allowed) {
    return res.status(402).json({ error: usage.message, code: 'UPGRADE_REQUIRED' });
  }

  const output = humanizeText(String(text));
  if (!usage.premium) {
    consumeTrial(req.user, req.db, usage.dayKey);
  }

  return res.json({ output, mode: usage.premium ? 'premium' : 'free-trial' });
});

app.post('/api/tools/detect', auth, (req, res) => {
  const { text, mediaName } = req.body;

  if (!text && !mediaName) {
    return res.status(400).json({ error: 'Provide text or media file name for detection.' });
  }

  const usage = enforceUsagePolicy(req.user);
  if (!usage.allowed) {
    return res.status(402).json({ error: usage.message, code: 'UPGRADE_REQUIRED' });
  }

  const baseText = String(text || mediaName || '');
  const aiLikelihood = detectAiScore(baseText);
  const verdict = aiLikelihood > 60 ? 'Likely AI-generated' : 'Likely human-written';

  if (!usage.premium) {
    consumeTrial(req.user, req.db, usage.dayKey);
  }

  return res.json({
    aiLikelihood,
    verdict,
    details: mediaName
      ? `Analyzed media label: ${mediaName}. For real media analysis connect your AI model provider.`
      : 'Text pattern-based detection completed.',
    mode: usage.premium ? 'premium' : 'free-trial'
  });
});

app.post('/api/subscription/checkout', auth, async (req, res) => {
  const { method, cardNumber, paypalEmail } = req.body;
  const normalizedMethod = String(method || '').toLowerCase();

  if (!['visa', 'paypal'].includes(normalizedMethod)) {
    return res.status(400).json({ error: 'Payment method must be Visa or PayPal.' });
  }

  if (normalizedMethod === 'visa') {
    const compact = String(cardNumber || '').replace(/\s+/g, '');
    if (!/^4\d{12}(\d{3})?$/.test(compact)) {
      return res.status(400).json({ error: 'Please enter a valid Visa card number.' });
    }
  }

  if (normalizedMethod === 'paypal') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(paypalEmail || '').toLowerCase())) {
      return res.status(400).json({ error: 'Please enter a valid PayPal email.' });
    }
  }

  const checkoutPayload = {
    amount: 12,
    currency: 'USD',
    description: 'Premium subscription (3 months)',
    reference: `premium-${req.user.id}-${Date.now()}`,
    customer: {
      email: req.user.email
    },
    metadata: {
      plan: 'premium_3_months',
      paymentMethod: normalizedMethod
    }
  };

  // Hook point for real PayChangu API calls.
  // Configure PAYCHANGU_SECRET_KEY and PAYCHANGU_CHECKOUT_URL for production.
  const checkoutUrl = process.env.PAYCHANGU_CHECKOUT_URL || 'https://api.paychangu.com/checkout';
  const hasKey = Boolean(process.env.PAYCHANGU_SECRET_KEY);

  let providerResponse = null;
  if (hasKey) {
    try {
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutPayload)
      });

      const json = await response.json();
      providerResponse = { ok: response.ok, status: response.status, data: json };
    } catch (error) {
      providerResponse = { ok: false, status: 500, data: { message: error.message } };
    }
  }

  // In this starter, we mark subscription active after request creation.
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + 3);

  req.user.subscription = {
    ...req.user.subscription,
    status: 'active',
    startedAt: startDate.toISOString(),
    expiresAt: expiryDate.toISOString(),
    paymentMethod: normalizedMethod,
    provider: 'PayChangu'
  };
  writeDb(req.db);

  return res.json({
    message: 'Subscription activated. Configure webhook verification before production use.',
    subscription: req.user.subscription,
    paychangu: {
      endpoint: checkoutUrl,
      request: checkoutPayload,
      providerResponse,
      note: hasKey
        ? 'Request attempted using PAYCHANGU_SECRET_KEY.'
        : 'No PAYCHANGU_SECRET_KEY found. Set it in environment to call PayChangu directly.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Humanizer AI server running on http://localhost:${PORT}`);
});
