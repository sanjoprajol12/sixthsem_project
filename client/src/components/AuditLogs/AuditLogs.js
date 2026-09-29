import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'PRODUCT_CREATE', label: 'Product Created' },
  { value: 'PRODUCT_UPDATE', label: 'Product Updated' },
  { value: 'SALE_CREATE', label: 'Sale Created' },
  { value: 'SALE_CANCEL', label: 'Sale Cancelled' },
  { value: 'CUSTOMER_RETURN', label: 'Customer Return' },
  { value: 'PO_APPROVE', label: 'Purchase Approved' },
  { value: 'PO_RECEIVE', label: 'Goods Received' },
  { value: 'DAMAGE_RECORDED', label: 'Damage Recorded' },
  { value: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment' }
];

const ENTITIES = [
  { value: 'all', label: 'All Entities' },
  { value: 'Product', label: 'Product' },
  { value: 'SalesOrder', label: 'Sales Order' },
  { value: 'PurchaseOrder', label: 'Purchase Order' },
  { value: 'StockAdjustment', label: 'Stock Adjustment' },
  { value: 'Damage', label: 'Damage' }
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [userQuery, setUserQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAction !== 'all') params.set('action', selectedAction);
      if (selectedEntity !== 'all') params.set('entity', selectedEntity);
      if (userQuery.trim()) params.set('user', userQuery.trim());
      params.set('limit', '100');

      const res = await axios.get(`/api/audit-logs?${params}`);
      setLogs(res.data || []);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [selectedAction, selectedEntity, userQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Trail</h1>
          <p>Immutable system audit logs tracking user operations and security events</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchLogs}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <select
              className="filter-select"
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
            >
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>

            <select
              className="filter-select"
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
            >
              {ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>

            <div className="table-search">
              <span className="table-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Filter by username..."
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {logs.length} events logged
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="table-empty">
            <span className="table-empty-icon">🔍</span>
            <div className="table-empty-text">No audit logs matching criteria</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.username || 'System'}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{log.user_id?.role || ''}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{log.action}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{log.entity}</span>
                    {log.entity_id && (
                      <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>
                        ID: {String(log.entity_id).slice(-6)}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setSelectedLog(log)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedLog(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title">🔍 Audit Event Details</div>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                <p><strong>Action:</strong> {selectedLog.action}</p>
                <p><strong>Target Entity:</strong> {selectedLog.entity} ({selectedLog.entity_id})</p>
                <p><strong>Actor:</strong> {selectedLog.username}</p>
                <p><strong>Timestamp:</strong> {new Date(selectedLog.created_at).toLocaleString()}</p>
                <p><strong>IP Address:</strong> {selectedLog.ip_address || 'localhost'}</p>
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Payload Snapshot:</div>
              <pre style={{
                background: '#1F2937',
                color: '#F9FAFB',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                overflowX: 'auto'
              }}>
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
