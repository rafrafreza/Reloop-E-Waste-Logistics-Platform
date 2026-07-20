import React from 'react';

const PrimaryButton = ({ children, type = 'button', loading = false, disabled = false, onClick }) => {
  return (
    <button
      type={type}
      className="auth-btn-primary"
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      <span className="btn-content">
        {loading ? <div className="auth-spinner" aria-label="Loading" /> : children}
      </span>
    </button>
  );
};

export default PrimaryButton;
