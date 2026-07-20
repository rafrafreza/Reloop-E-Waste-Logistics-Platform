import React, { useState } from 'react';
import { Bell, ChevronDown, Menu } from 'lucide-react';
import Logo from '../Logo';
import ProfileDropdown from './ProfileDropdown';

const Header = ({ userName, onMenuToggle }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>
        <Logo size="small" />
        <span className="header-title">Dashboard</span>
      </div>

      <div className="header-right">
        <button className="notification-bell" aria-label="Notifications">
          <Bell size={20} />
          <span className="bell-badge"></span>
        </button>

        <div
          className="profile-dropdown-container"
        >
          <button
            className="user-profile-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="user-avatar">
              {getInitials(userName)}
            </div>
            <span className="user-name">Hi, {userName || 'User'}</span>
            <ChevronDown size={16} className={`dropdown-chevron ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <ProfileDropdown
            isOpen={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
