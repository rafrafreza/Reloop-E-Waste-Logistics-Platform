import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { removeToken } from '../../api/auth';

const ProfileDropdown = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleProfileClick = () => {
    navigate('/dashboard/profile');
    onClose();
  };

  const handleLogoutClick = () => {
    removeToken();
    navigate('/login');
    onClose();
  };

  return (
    <div
      className="profile-dropdown-menu"
      onMouseLeave={onClose}
    >
      <button className="dropdown-item" onClick={handleProfileClick}>
        <User size={16} />
        <span>Profile</span>
      </button>
      <button className="dropdown-item logout" onClick={handleLogoutClick}>
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default ProfileDropdown;
