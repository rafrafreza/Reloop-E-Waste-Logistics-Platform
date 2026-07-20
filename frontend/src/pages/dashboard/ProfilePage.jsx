import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, Mail, Phone, Shield, MapPin } from 'lucide-react';

const ProfilePage = () => {
  const { userProfile } = useOutletContext();

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Profile</h2>
        <p className="page-subtitle">View your profile details and settings.</p>
      </div>

      <div className="form-card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--dash-border)' }}>
          <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
            {userProfile?.name ? userProfile.name.split(' ').map((n) => n[0]).slice(0,2).join('').toUpperCase() : 'U'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--dash-text)' }}>{userProfile?.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--dash-primary)', fontWeight: 600, backgroundColor: 'var(--dash-light-green)', padding: '0.2rem 0.6rem', borderRadius: '50px', display: 'inline-block', marginTop: '0.25rem' }}>
              {userProfile?.role}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Mail size={18} className="text-gray-500" style={{ color: 'var(--dash-text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Email Address</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{userProfile?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Phone size={18} className="text-gray-500" style={{ color: 'var(--dash-text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Phone Number</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{userProfile?.phone_number || 'Not Provided'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Shield size={18} className="text-gray-500" style={{ color: 'var(--dash-text-secondary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Account Status</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: userProfile?.is_active ? '#16A34A' : '#DC2626' }}>
                {userProfile?.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {userProfile?.customer_profile && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', borderTop: '1px solid var(--dash-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <MapPin size={18} className="text-gray-500" style={{ color: 'var(--dash-text-secondary)', marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dash-text-secondary)' }}>Default Address Details</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.25rem' }}>
                  {userProfile.customer_profile.address || 'No address added yet.'}
                </div>
                {(userProfile.customer_profile.city || userProfile.customer_profile.state) && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--dash-text-secondary)', marginTop: '0.1rem' }}>
                    {[userProfile.customer_profile.city, userProfile.customer_profile.state].filter(Boolean).join(', ')} 
                    {userProfile.customer_profile.postal_code ? ` - ${userProfile.customer_profile.postal_code}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
