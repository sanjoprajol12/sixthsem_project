import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Reusable ActionMenu component using <i className="ri-more-fill"></i>.
 * Uses a React Portal to render the dropdown at document.body level,
 * guaranteeing it is never clipped by table containers or overflow wrappers.
 *
 * Props:
 * - actions: Array of {
 *     label: string,
 *     icon?: string (e.g. 'ri-eye-line', 'ri-edit-line', 'ri-check-line', etc.),
 *     onClick: (e) => void,
 *     danger?: boolean,
 *     success?: boolean,
 *     warning?: boolean,
 *     disabled?: boolean,
 *     hidden?: boolean
 *   }
 * - title?: string (button tooltip)
 * - align?: 'right' | 'left'
 */
const ActionMenu = ({ actions = [], title = 'Actions', align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter out hidden actions
  const visibleActions = actions.filter((act) => act && !act.hidden);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const menuEstimatedHeight = visibleActions.length * 36 + 16;
    
    // Vertical placement
    let top = rect.bottom + window.scrollY + 4;
    // Check if dropdown overflows bottom of viewport
    if (rect.bottom + menuEstimatedHeight > window.innerHeight && rect.top > menuEstimatedHeight) {
      top = rect.top + window.scrollY - menuEstimatedHeight - 4;
    }

    // Horizontal placement
    let left;
    if (align === 'right') {
      left = rect.right + window.scrollX - menuWidth;
    } else {
      left = rect.left + window.scrollX;
    }

    // Viewport bounds checking
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({ top, left });
  }, [align, visibleActions.length]);

  const toggleOpen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      // Reposition on scroll or close if needed
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (visibleActions.length === 0) {
    return null;
  }

  const dropdownPortal = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="action-menu-dropdown"
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 9999,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {visibleActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              className={`action-menu-item ${action.danger ? 'action-danger' : ''} ${
                action.success ? 'action-success' : ''
              } ${action.warning ? 'action-warning' : ''}`}
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                if (action.onClick) action.onClick(e);
              }}
            >
              {action.icon && <i className={`${action.icon} action-menu-icon`}></i>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="action-menu-wrapper" style={{ display: 'inline-flex', position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        className={`action-menu-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
        title={title}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <i className="ri-more-fill"></i>
      </button>
      {dropdownPortal}
    </div>
  );
};

export default ActionMenu;
