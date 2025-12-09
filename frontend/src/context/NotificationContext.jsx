import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ToastContainer';
import Modal from '../components/Modal';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState({ isOpen: false });

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showModal = useCallback(({ title, message, type = 'info', onConfirm, confirmText, cancelText, showCancel = true }) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
      showCancel
    });
  }, []);

  const hideModal = useCallback(() => {
    setModal({ isOpen: false });
  }, []);

  const confirm = useCallback(({ title, message, onConfirm, confirmText, cancelText }) => {
    showModal({
      title: title || 'Confirmation',
      message,
      type: 'warning',
      onConfirm,
      confirmText: confirmText || 'Confirmer',
      cancelText: cancelText || 'Annuler',
      showCancel: true
    });
  }, [showModal]);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showModal,
    hideModal,
    confirm
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
      />
    </NotificationContext.Provider>
  );
};

