import React from 'react';

const FeatureItem = ({ icon: Icon, text }) => {
  return (
    <div className="auth-feature-item">
      <div className="auth-feature-icon">
        <Icon size={14} />
      </div>
      <span className="auth-feature-text">{text}</span>
    </div>
  );
};

export default FeatureItem;
