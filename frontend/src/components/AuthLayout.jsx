import React from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';
import FeatureItem from './FeatureItem';
import { Shield, Leaf, Zap, HeadphonesIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/auth.css';

const FEATURES = [
  { icon: Shield, text: 'Secure & Trusted' },
  { icon: Leaf, text: 'Sustainable Impact' },
  { icon: Zap, text: 'Smart & Efficient' },
  { icon: HeadphonesIcon, text: 'Support Anytime' },
];

// Inline SVG illustration — eco-friendly recycling truck
const EcoTruckIllustration = () => (
  <svg
    viewBox="0 0 400 280"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="auth-illustration"
    aria-hidden="true"
  >
    {/* Ground */}
    <ellipse cx="200" cy="250" rx="180" ry="18" fill="#C8E6C9" opacity="0.5" />

    {/* Truck body */}
    <rect x="80" y="130" width="200" height="90" rx="12" fill="#2E7D32" />
    <rect x="85" y="135" width="190" height="80" rx="8" fill="#43A047" />

    {/* Truck cabin */}
    <rect x="260" y="110" width="70" height="110" rx="10" fill="#2E7D32" />
    <rect x="268" y="118" width="54" height="40" rx="6" fill="#A5D6A7" />
    <rect x="272" y="122" width="46" height="32" rx="4" fill="#E8F5E9" />

    {/* Recycle symbol on truck */}
    <circle cx="175" cy="175" r="28" fill="#E8F5E9" opacity="0.9" />
    <g transform="translate(157, 157)">
      <path d="M18 4l-4 6h8l-4-6z" fill="#2E7D32" />
      <path d="M8 22l4-6H4l4 6z" fill="#2E7D32" />
      <path d="M28 22l-4-6v0l-4 6h8z" fill="#2E7D32" />
      <path d="M12 10l-4 6" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 10l4 6" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 22h8" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
    </g>

    {/* Wheels */}
    <circle cx="140" cy="225" r="22" fill="#37474F" />
    <circle cx="140" cy="225" r="12" fill="#78909C" />
    <circle cx="140" cy="225" r="4" fill="#37474F" />
    <circle cx="290" cy="225" r="22" fill="#37474F" />
    <circle cx="290" cy="225" r="12" fill="#78909C" />
    <circle cx="290" cy="225" r="4" fill="#37474F" />

    {/* Leaves decoration */}
    <g opacity="0.8">
      <ellipse cx="60" cy="120" rx="12" ry="6" fill="#66BB6A" transform="rotate(-30, 60, 120)" />
      <ellipse cx="55" cy="115" rx="10" ry="5" fill="#81C784" transform="rotate(-60, 55, 115)" />
      <ellipse cx="340" cy="100" rx="14" ry="7" fill="#66BB6A" transform="rotate(20, 340, 100)" />
      <ellipse cx="350" cy="95" rx="12" ry="5" fill="#81C784" transform="rotate(50, 350, 95)" />
    </g>

    {/* Small items in truck */}
    <rect x="100" y="148" width="20" height="16" rx="2" fill="#FFA726" opacity="0.9" />
    <rect x="130" y="152" width="18" height="12" rx="2" fill="#42A5F5" opacity="0.9" />
    <rect x="160" y="146" width="22" height="18" rx="3" fill="#EF5350" opacity="0.7" />
    <rect x="195" y="150" width="16" height="14" rx="2" fill="#AB47BC" opacity="0.8" />
    <rect x="220" y="148" width="20" height="16" rx="2" fill="#26C6DA" opacity="0.9" />

    {/* Exhaust cloud (clean/green) */}
    <circle cx="75" cy="190" r="8" fill="#A5D6A7" opacity="0.4" />
    <circle cx="58" cy="185" r="10" fill="#C8E6C9" opacity="0.3" />
    <circle cx="45" cy="178" r="6" fill="#E8F5E9" opacity="0.3" />
  </svg>
);

const AuthLayout = ({
  heading,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
  children,
}) => {
  return (
    <div className="auth-page">
      <div className="auth-layout">
        {/* Left Panel */}
        <motion.div
          className="auth-left-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="auth-left-content">
            <Logo />

            <h1 className="auth-left-heading">{heading}</h1>
            <p className="auth-left-subtitle">{subtitle}</p>

            <div className="auth-illustration-wrapper">
              <EcoTruckIllustration />
            </div>

            <div className="auth-features-list">
              {FEATURES.map((feat, i) => (
                <FeatureItem key={i} icon={feat.icon} text={feat.text} />
              ))}
            </div>

            {footerText && (
              <p className="auth-left-footer">
                {footerText}{' '}
                <Link to={footerLinkTo}>{footerLinkText}</Link>
              </p>
            )}
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div
          className="auth-right-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="auth-form-container">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
