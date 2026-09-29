const { AuditLog } = require('../models');

class AuditService {
  /**
   * Log an activity in the audit ledger
   */
  static async log({ userId, username, action, entity, entityId, details, req }) {
    try {
      const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
      return await AuditLog.create({
        user_id: userId || null,
        username: username || 'System',
        action,
        entity,
        entity_id: entityId ? entityId.toString() : null,
        details: details || {},
        ip_address: ipAddress
      });
    } catch (err) {
      console.error('AuditLog error:', err.message);
      // Non-blocking so audit failures don't halt critical business operations
      return null;
    }
  }
}

module.exports = AuditService;
