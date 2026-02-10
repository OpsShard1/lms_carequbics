const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ? AND u.is_active = true
    `, [decoded.userId]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin has access to everything
    if (req.user.role_name === 'super_admin') {
      return next();
    }
    
    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

const checkSectionAccess = (sectionType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin has access to all sections
    if (req.user.role_name === 'super_admin') {
      return next();
    }
    
    const userSection = req.user.section_type;
    if (userSection !== 'both' && userSection !== sectionType) {
      return res.status(403).json({ error: `Access denied. You don't have ${sectionType} section access.` });
    }
    next();
  };
};

module.exports = { authenticate, authorize, checkSectionAccess };
