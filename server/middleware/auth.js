const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Flexible RBAC middleware.
 * Super Admins and Admins automatically inherit all operational permissions.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    // Super Admin and Admin have universal bypass for all roles
    if (userRole === 'super_admin' || userRole === 'admin') {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${userRole}`
    });
  };
};

const requireAdmin = requireRole('super_admin', 'admin');
const canManageInventory = requireRole('super_admin', 'admin', 'inventory_manager');
const canManagePurchases = requireRole('super_admin', 'admin', 'inventory_manager', 'purchase_staff');
const canManageSales = requireRole('super_admin', 'admin', 'sales_staff', 'staff');
const canViewReports = requireRole('super_admin', 'admin', 'inventory_manager', 'purchase_staff', 'sales_staff', 'staff');

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  canManageInventory,
  canManagePurchases,
  canManageSales,
  canViewReports
};
