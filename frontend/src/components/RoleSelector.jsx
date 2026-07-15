import React from 'react';
import { FiUser, FiPackage, FiTruck } from 'react-icons/fi';

const ROLES = [
  { key: 'consumer', label: 'Consumer', icon: FiUser },
  { key: 'segregation', label: 'Segregation Centre', icon: FiPackage },
  { key: 'driver', label: 'Driver', icon: FiTruck },
];

const RoleSelector = ({ selectedRole, onRoleChange }) => {
  return (
    <div className="role-selector">
      <span className="role-selector-label">Select your role</span>
      <div className="role-selector-grid" role="radiogroup" aria-label="Select your role">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isActive = selectedRole === role.key;
          return (
            <button
              key={role.key}
              type="button"
              className={`role-card ${isActive ? 'active' : ''}`}
              onClick={() => onRoleChange(role.key)}
              role="radio"
              aria-checked={isActive}
              aria-label={role.label}
            >
              <div className="role-card-icon">
                <Icon size={18} />
              </div>
              <span className="role-card-label">{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleSelector;
