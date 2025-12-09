import React from 'react';
import './Modal.scss';

const Modal = ({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'Confirmer', cancelText = 'Annuler', showCancel = true }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-icon">
              {type === 'success' && '✅'}
              {type === 'error' && '❌'}
              {type === 'warning' && '⚠️'}
              {type === 'info' && 'ℹ️'}
            </span>
            {title}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          {showCancel && (
            <button className="btn-secondary" onClick={onClose}>
              {cancelText}
            </button>
          )}
          <button 
            className={`btn-primary btn-${type}`} 
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

