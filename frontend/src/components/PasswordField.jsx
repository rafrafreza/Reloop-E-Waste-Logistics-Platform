import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';

const PasswordField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  required = false,
  showStrength = false,
  autoComplete,
}) => {
  const [visible, setVisible] = useState(false);
  const inputId = `auth-field-${name}`;

  // Password strength checks
  const checks = {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
  };

  const metCount = Object.values(checks).filter(Boolean).length;
  const strengthLabel =
    metCount === 0 ? '' : metCount === 1 ? 'weak' : metCount === 2 ? 'fair' : metCount === 3 ? 'good' : 'strong';

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
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`auth-input has-toggle ${error ? 'error' : ''} ${!Icon ? 'no-icon' : ''}`}
          style={!Icon ? { paddingLeft: '0.9rem' } : undefined}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>

      {error && (
        <div className="auth-field-error" id={`${inputId}-error`} role="alert">
          <FiAlertCircle size={12} />
          {error}
        </div>
      )}

      {showStrength && value.length > 0 && (
        <div className="password-strength">
          <div className="password-strength-bar">
            <div className={`password-strength-fill ${strengthLabel}`} />
          </div>
          <div className="password-requirements">
            <div className={`password-req-item ${checks.minLength ? 'met' : ''}`}>
              <span className="password-req-icon">
                {checks.minLength ? <FiCheck size={10} /> : <FiX size={10} />}
              </span>
              Min 8 characters
            </div>
            <div className={`password-req-item ${checks.uppercase ? 'met' : ''}`}>
              <span className="password-req-icon">
                {checks.uppercase ? <FiCheck size={10} /> : <FiX size={10} />}
              </span>
              One uppercase
            </div>
            <div className={`password-req-item ${checks.number ? 'met' : ''}`}>
              <span className="password-req-icon">
                {checks.number ? <FiCheck size={10} /> : <FiX size={10} />}
              </span>
              One number
            </div>
            <div className={`password-req-item ${checks.special ? 'met' : ''}`}>
              <span className="password-req-icon">
                {checks.special ? <FiCheck size={10} /> : <FiX size={10} />}
              </span>
              One special char
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordField;
