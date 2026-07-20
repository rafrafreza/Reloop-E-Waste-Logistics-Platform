import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NewRequestPage from '../pages/dashboard/NewRequestPage';
import ProfilePage from '../pages/dashboard/ProfilePage';
import SupportPage from '../pages/dashboard/SupportPage';
import ActiveRequestsPage from '../pages/requests/ActiveRequestsPage';
import CompletedRequestsPage from '../pages/requests/CompletedRequestsPage';
import CancelledRequestsPage from '../pages/requests/CancelledRequestsPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/new-request" replace />} />
        <Route path="new-request" element={<NewRequestPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="requests/active" element={<ActiveRequestsPage />} />
        <Route path="requests/completed" element={<CompletedRequestsPage />} />
        <Route path="requests/cancelled" element={<CancelledRequestsPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
