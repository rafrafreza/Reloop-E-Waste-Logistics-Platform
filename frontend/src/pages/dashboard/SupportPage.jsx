import React from 'react';
import { HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';

const SupportPage = () => {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Support</h2>
        <p className="page-subtitle">Need help? Get in touch with our customer service team.</p>
      </div>

      <div className="form-card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--dash-border)' }}>
          <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
            <HelpCircle size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--dash-text)' }}>Help Centre</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--dash-text-secondary)' }}>We're here to help you clear your e-waste sustainably.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Mail size={18} style={{ color: 'var(--dash-primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Email Support</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>support@reloop-ewaste.com</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Phone size={18} style={{ color: 'var(--dash-primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Helpline Number</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>+1 (800) 555-RELOOP</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <MessageSquare size={18} style={{ color: 'var(--dash-primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Frequently Asked Questions</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--dash-primary)', cursor: 'pointer' }}>
                Visit our FAQ portal
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
