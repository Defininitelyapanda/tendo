const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'tendo-dev-secret-change-me';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash: `${salt}:${hash}` };
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireWorkspaceAccess(req, res, next) {
  const workspaceId = req.params.workspaceId || req.body.workspace_id || req.query.workspaceId;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace id is required.' });
  }

  const member = db.prepare(`
    SELECT wm.role, wm.permissions
    FROM workspace_members wm
    WHERE wm.user_id = ? AND wm.workspace_id = ?
  `).get(req.user.id, workspaceId);

  if (!member) {
    return res.status(403).json({ error: 'You do not have access to this workspace.' });
  }

  req.workspace = { id: workspaceId };
  req.membership = member;
  return next();
}

function requireWorkspaceAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.membership.role === 'owner' || req.membership.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Administrator authorization required.' });
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueToken,
  requireAuth,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
};
