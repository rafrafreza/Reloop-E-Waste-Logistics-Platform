import React from 'react';

const SocialButton = ({ icon: Icon, label, onClick }) => {
  return (
    <button
      type="button"
      className="auth-btn-social"
      onClick={onClick}
      aria-label={label}
    >
      <span className="auth-social-icon">
        <Icon size={18} />
      </span>
      {label}
    </button>
  );
};

export default SocialButton;
