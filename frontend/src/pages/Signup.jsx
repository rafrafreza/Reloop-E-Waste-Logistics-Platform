import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiPhone } from 'react-icons/fi';


import AuthLayout from '../components/AuthLayout';
import RoleSelector from '../components/RoleSelector';
import TextField from '../components/TextField';
import PasswordField from '../components/PasswordField';
import PrimaryButton from '../components/PrimaryButton';


import { registerCustomer, registerDriver, registerCompany } from '../api/auth';

const Signup = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('consumer');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s-]{8,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password needs an uppercase letter';
      else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Password needs a number';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) newErrors.password = 'Password needs a special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the terms';
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
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
      };

      if (role === 'consumer') {
        await registerCustomer(payload);
      } else if (role === 'driver') {
        await registerDriver(payload);
      } else if (role === 'segregation') {
        await registerCompany(payload);
      }

      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Registration failed. Please try again.';
      setApiError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Create Account"
      subtitle="Join us and be a part of the sustainable e-waste ecosystem."
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkTo="/login"
    >
      <motion.div
        className="auth-form-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
      >
        <h2 className="auth-form-heading">Create Account</h2>
        <p className="auth-form-subtitle">Fill in your details to get started.</p>

        {apiError && (
          <div className="auth-error-alert" role="alert">
            <FiUser size={14} />
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <RoleSelector selectedRole={role} onRoleChange={setRole} />

          <TextField
            label="Full Name"
            name="signup-name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={updateField('name')}
            error={errors.name}
            icon={FiUser}
            required
            autoComplete="name"
          />

          <TextField
            label="Phone Number"
            name="signup-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={updateField('phone')}
            error={errors.phone}
            icon={FiPhone}
            required
            autoComplete="tel"
          />

          <TextField
            label="Email Address"
            name="signup-email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={updateField('email')}
            error={errors.email}
            icon={FiMail}
            required
            autoComplete="email"
          />

          <PasswordField
            label="Password"
            name="signup-password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={updateField('password')}
            error={errors.password}
            icon={FiLock}
            required
            showStrength
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm Password"
            name="signup-confirm-password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={updateField('confirmPassword')}
            error={errors.confirmPassword}
            icon={FiLock}
            required
            autoComplete="new-password"
          />

          <div className="auth-terms-checkbox">
            <input
              type="checkbox"
              id="agree-terms"
              className="auth-checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <label htmlFor="agree-terms">
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && (
            <div className="auth-field-error" role="alert" style={{ marginTop: '-0.75rem', marginBottom: '1rem' }}>
              {errors.terms}
            </div>
          )}

          <PrimaryButton type="submit" loading={loading}>
            Create Account
          </PrimaryButton>
        </form>


      </motion.div>
    </AuthLayout>
  );
};

export default Signup;
