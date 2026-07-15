import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock } from 'react-icons/fi';


import AuthLayout from '../components/AuthLayout';
import RoleSelector from '../components/RoleSelector';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';
import PrimaryButton from '../components/PrimaryButton';


import { loginUser, storeToken } from '../api/auth';

const Login = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('consumer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const tokenData = await loginUser(email, password);
      storeToken(tokenData);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setApiError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Welcome Back!"
      subtitle="Login to your account and continue managing e-waste the smart way."
      footerText="New to the platform?"
      footerLinkText="Create an account"
      footerLinkTo="/signup"
    >
      <motion.div
        className="auth-form-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
      >
        <h2 className="auth-form-heading">Login</h2>
        <p className="auth-form-subtitle">Enter your credentials to access your account.</p>

        {apiError && (
          <div className="auth-error-alert" role="alert">
            <FiLock size={14} />
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <RoleSelector selectedRole={role} onRoleChange={setRole} />

          <TextField
            label="Email Address"
            name="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={FiMail}
            required
            autoComplete="email"
          />

          <PasswordField
            label="Password"
            name="login-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={FiLock}
            required
            autoComplete="current-password"
          />

          <div className="auth-row-between">
            <div className="auth-checkbox-group">
              <input
                type="checkbox"
                id="remember-me"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="auth-checkbox-label">
                Remember Me
              </label>
            </div>
            <a href="#" className="auth-forgot-link">Forgot Password?</a>
          </div>

          <PrimaryButton type="submit" loading={loading}>
            Login
          </PrimaryButton>
        </form>

        <div className="auth-terms-footer">
          <a href="#">Terms of Service</a> · <a href="#">Privacy Policy</a>
        </div>
      </motion.div>
    </AuthLayout>
  );
};

export default Login;
