import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const TextField = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  required = false,
  autoComplete,
}) => {
  const inputId = `auth-field-${name}`;

  return (
    <div className="auth-field">
      <label htmlFor={inputId} className="auth-field-label">
        {label}
        {required && <span style={{ color: 'var(--auth-error)', marginLeft: '2px' }}>*</span>}
      </label>
      <div className="auth-input-wrapper">
        {Icon && (
          <span className="auth-input-icon">
            <Icon size={16} />
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`auth-input ${error ? 'error' : ''} ${!Icon ? 'no-icon' : ''}`}
          style={!Icon ? { paddingLeft: '0.9rem' } : undefined}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error && (
        <div className="auth-field-error" id={`${inputId}-error`} role="alert">
          <FiAlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

export default TextField;
