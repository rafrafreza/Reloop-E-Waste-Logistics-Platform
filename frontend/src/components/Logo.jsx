import React from 'react';
import { Recycle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Logo = ({ size = 'default' }) => {
  const iconSize = size === 'small' ? 16 : 20;

  return (
    <Link to="/" className="auth-logo" aria-label="ReLoop Home">
      <div className="auth-logo-icon">
        <Recycle size={iconSize} />
      </div>
      <span className="auth-logo-text">ReLoop</span>
    </Link>
  );
};

export default Logo;
