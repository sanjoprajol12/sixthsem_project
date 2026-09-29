import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

/**
 * Reusable confirmation dialog that replaces window.confirm / window.alert.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete Supplier?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     danger
 *     loading={deleting}
 *     onCancel={() => setShowConfirm(false)}
 *     onConfirm={handleDelete}
 *   />
 */
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onCancel,
  onConfirm
}) => {
  const confirmBtnRef = useRef(null);

  // Focus the confirm button when it opens so keyboard users can press Enter
  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="modal-overlay confirm-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div className="modal modal-sm confirm-dialog">
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <div className="modal-title" id="confirm-dialog-title">
            <i
              className={danger ? 'ri-error-warning-line' : 'ri-question-line'}
              style={{ marginRight: 8, color: danger ? 'var(--danger, #dc2626)' : 'var(--primary)' }}
            />
            {title}
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-sm" style={{ width: 14, height: 14, marginRight: 6 }} />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
