import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { getUserProfile } from '../../api/pickups';
import { getToken } from '../../api/auth';
import '../../styles/dashboard.css';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setUserProfile(data);
      } catch (err) {
        console.error('Failed to load user profile', err);
        // If profile fetch fails (e.g. invalid token), redirect to login
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#F9FAFB',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          fontSize: '1rem',
          color: '#6B7280',
          fontWeight: 500
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <div className="dashboard-main">
        <Header 
          userName={userProfile?.name} 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="dashboard-content">
          <Outlet context={{ userProfile }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
