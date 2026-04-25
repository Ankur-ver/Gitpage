import { Router, Request, Response } from 'express';
import Joi                           from 'joi';
import axios                         from 'axios';
import User                          from '../models/User';
import { protect, AuthRequest }      from '../middleware/auth';
import { signToken }                 from '../config/jwt';        // ✅ only import this

const router = Router();

/* ── ENV ─────────────────────────────────────────────────────────── */
// ✅ removed local JWT_SECRET — config/jwt.ts owns it exclusively
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const API_URL    = process.env.API_URL    || 'http://localhost:5000';

/* ── Helpers ─────────────────────────────────────────────────────── */
const safeUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

async function upsertOAuthUser(profile: {
  provider   : 'github' | 'google';
  providerId : string;
  email      : string;
  username   : string;
  displayName: string;
  avatarUrl  : string;
}) {
  const { provider, providerId, email, username, displayName, avatarUrl } = profile;

  /* 1 — existing OAuth link */
  let user = await User.findOne({ [`oauth.${provider}.id`]: providerId });
  if (user) return user;

  /* 2 — same email → link provider to existing account */
  user = await User.findOne({ email });
  if (user) {
    user.set(`oauth.${provider}`, { id: providerId });
    if (!user.avatarUrl)    user.avatarUrl    = avatarUrl;
    if (!user.displayName)  user.displayName  = displayName;
    await user.save();
    return user;
  }

  /* 3 — create new user */
  let safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'user';
  const taken      = await User.findOne({ username: safeUsername });
  if (taken) safeUsername = `${safeUsername}${Date.now().toString().slice(-5)}`;

  user = await User.create({
    username   : safeUsername,
    email,
    displayName,
    avatarUrl,
    password   : `oauth_${Math.random().toString(36).slice(2)}${Date.now()}`,
    oauth      : { [provider]: { id: providerId } },
  });
  return user;
}

/* ══════════════════════════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════════════════════════ */
router.post('/register', async (req: Request, res: Response) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(39).required(),
    email   : Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const exists = await User.findOne({
      $or: [{ email: value.email }, { username: value.username }],
    });
    if (exists) {
      return res.status(400).json({
        message: exists.email === value.email
          ? 'Email already registered'
          : 'Username already taken',
      });
    }

    const user  = await User.create(value);
    const token = signToken(user.id);      // ✅
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════════ */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user.id);      // ✅
    res.json({ token, user: safeUser(user) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /me
══════════════════════════════════════════════════════════════════ */
router.get('/me', protect, (req: AuthRequest, res: Response) => {
  res.json(safeUser(req.user));
});

/* ══════════════════════════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════════════════════════ */
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/* ══════════════════════════════════════════════════════════════════
   GITHUB OAUTH
══════════════════════════════════════════════════════════════════ */
router.get('/github', (_req: Request, res: Response) => {
  if (!process.env.GITHUB_CLIENT_ID)
    return res.status(503).json({ message: 'GitHub OAuth not configured' });

  const params = new URLSearchParams({
    client_id   : process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${API_URL}/api/auth/github/callback`,
    scope       : 'user:email read:user',
    state       : Math.random().toString(36).slice(2),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get('/github/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.redirect(`${CLIENT_URL}/oauth/callback?error=github_denied`);

  try {
    const tokenRes = await axios.post<{ access_token?: string; error?: string }>(
      'https://github.com/login/oauth/access_token',
      {
        client_id    : process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri : `${API_URL}/api/auth/github/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      console.error('[GitHub OAuth] no access_token:', tokenRes.data);
      return res.redirect(`${CLIENT_URL}/oauth/callback?error=github_failed`);
    }

    const authHeader = { Authorization: `Bearer ${accessToken}` };
    const [profileRes, emailsRes] = await Promise.all([
      axios.get('https://api.github.com/user',        { headers: authHeader }),
      axios.get('https://api.github.com/user/emails', { headers: authHeader }),
    ]);

    const ghUser  = profileRes.data;
    const emails  = emailsRes.data as { email: string; primary: boolean; verified: boolean }[];
    const primary = emails.find(e => e.primary && e.verified) ?? emails[0];
    const email   = primary?.email ?? ghUser.email ?? `${ghUser.login}@users.noreply.github.com`;

    const user  = await upsertOAuthUser({
      provider   : 'github',
      providerId : String(ghUser.id),
      email,
      username   : ghUser.login,
      displayName: ghUser.name || ghUser.login,
      avatarUrl  : ghUser.avatar_url,
    });

    const token = signToken(user.id);     // ✅ shared signToken
    console.log(`[GitHub OAuth] ✅ ${user.username}`);

    // ✅ encodeURIComponent prevents token special chars breaking URL
    res.redirect(
      `${CLIENT_URL}/oauth/callback?token=${encodeURIComponent(token)}&provider=github`
    );
  } catch (err: any) {
    console.error('[GitHub OAuth] callback error:', err.message);
    res.redirect(`${CLIENT_URL}/oauth/callback?error=github_failed`);
  }
});

/* ══════════════════════════════════════════════════════════════════
   GOOGLE OAUTH
══════════════════════════════════════════════════════════════════ */
router.get('/google', (_req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(503).json({ message: 'Google OAuth not configured' });

  const params = new URLSearchParams({
    client_id    : process.env.GOOGLE_CLIENT_ID,
    redirect_uri : `${API_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope        : 'openid email profile',
    access_type  : 'offline',
    prompt       : 'select_account',
    state        : Math.random().toString(36).slice(2),
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.redirect(`${CLIENT_URL}/oauth/callback?error=google_denied`);

  try {
    const tokenRes = await axios.post<{ access_token?: string; error?: string }>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id    : process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri : `${API_URL}/api/auth/google/callback`,
        grant_type   : 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      console.error('[Google OAuth] no access_token:', tokenRes.data);
      return res.redirect(`${CLIENT_URL}/oauth/callback?error=google_failed`);
    }

    const profileRes = await axios.get<{
      sub    : string;
      email  : string;
      name   : string;
      picture: string;
    }>(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const gUser       = profileRes.data;
    const emailPrefix = gUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');

    const user  = await upsertOAuthUser({
      provider   : 'google',
      providerId : gUser.sub,
      email      : gUser.email,
      username   : emailPrefix,
      displayName: gUser.name,
      avatarUrl  : gUser.picture,
    });

    const token = signToken(user.id);     // ✅ shared signToken
    console.log(`[Google OAuth] ✅ ${user.username}`);

    // ✅ encodeURIComponent prevents token special chars breaking URL
    res.redirect(
      `${CLIENT_URL}/oauth/callback?token=${encodeURIComponent(token)}&provider=google`
    );
  } catch (err: any) {
    console.error('[Google OAuth] callback error:', err.message);
    res.redirect(`${CLIENT_URL}/oauth/callback?error=google_failed`);
  }
});

export default router;