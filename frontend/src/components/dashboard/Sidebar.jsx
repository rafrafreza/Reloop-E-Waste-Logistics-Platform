import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  ChevronRight, 
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Logo from '../Logo';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  let collapseTimeout = null;

  // Auto-expand submenu if current route is one of the request types
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/requests')) {
      setRequestsExpanded(true);
    }
  }, [location.pathname]);

  const handleRequestsClick = (e) => {
    e.preventDefault();
    setRequestsExpanded(!requestsExpanded);
  };

  const handleMouseEnter = () => {
    if (collapseTimeout) clearTimeout(collapseTimeout);
    setRequestsExpanded(true);
  };

  const handleMouseLeave = () => {
    // delay collapse on mouse leave for smoother feel
    collapseTimeout = setTimeout(() => {
      if (!location.pathname.startsWith('/dashboard/requests')) {
        setRequestsExpanded(false);
      }
    }, 800);
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      <aside 
        className={`dashboard-sidebar ${isOpen ? 'sidebar-open' : ''}`}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-logo">
          <Logo />
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/dashboard/new-request"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="sidebar-link-content">
              <Plus size={20} />
              <span>New Request</span>
            </div>
          </NavLink>

          <div 
            className="sidebar-dropdown-group"
            onMouseEnter={handleMouseEnter}
          >
            <button 
              onClick={handleRequestsClick}
              className={`sidebar-link ${location.pathname.startsWith('/dashboard/requests') ? 'active' : ''}`}
              aria-expanded={requestsExpanded}
            >
              <div className="sidebar-link-content">
                <FileText size={20} />
                <span>My Requests</span>
              </div>
              <ChevronRight 
                size={16} 
                className={`sidebar-link-chevron ${requestsExpanded ? 'expanded' : ''}`} 
              />
            </button>

            <div className={`submenu-container ${requestsExpanded ? 'expanded' : ''}`}>
              <NavLink 
                to="/dashboard/requests/active"
                className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Clock size={16} />
                <span>Active Requests</span>
              </NavLink>
              <NavLink 
                to="/dashboard/requests/completed"
                className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <CheckCircle size={16} />
                <span>Completed Requests</span>
              </NavLink>
              <NavLink 
                to="/dashboard/requests/cancelled"
                className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <XCircle size={16} />
                <span>Cancelled Requests</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Support at the bottom of sidebar */}
        <div className="sidebar-footer">
          <NavLink 
            to="/dashboard/support"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <div className="sidebar-link-content">
              <HelpCircle size={20} />
              <span>Support</span>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
