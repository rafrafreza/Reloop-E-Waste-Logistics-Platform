import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import AppShell from "./components/layout/AppShell";

import Home from "./pages/public/Home";
import HowItWorks from "./pages/public/HowItWorks";
import Pricing from "./pages/public/Pricing";
import PublicImpact from "./pages/public/Impact";
import FAQ from "./pages/public/FAQ";
import Contact from "./pages/public/Contact";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Support from "./pages/Support";

import ConsumerDashboard from "./pages/consumer/Dashboard";
import ConsumerAddresses from "./pages/consumer/Addresses";
import ConsumerNewRequest from "./pages/consumer/NewRequest";
import ConsumerRequests from "./pages/consumer/Requests";
import ConsumerRequestDetail from "./pages/consumer/RequestDetail";
import ConsumerImpact from "./pages/consumer/Impact";
import ConsumerCertificate from "./pages/consumer/Certificate";

import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerAssignments from "./pages/partner/Assignments";
import PartnerRequestDetail from "./pages/partner/RequestDetail";
import PartnerHistory from "./pages/partner/History";
import PartnerEarnings from "./pages/partner/Earnings";

import CentreDashboard from "./pages/centre/Dashboard";
import CentreIncoming from "./pages/centre/IncomingRequests";
import CentreActive from "./pages/centre/ActiveRequests";
import CentreInventory from "./pages/centre/Inventory";
import CentreHistory from "./pages/centre/History";
import CentreRequestDetail from "./pages/centre/RequestDetail";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCategories from "./pages/admin/Categories";
import AdminSettings from "./pages/admin/Settings";
import AdminRequests from "./pages/admin/Requests";
import AdminRevenue from "./pages/admin/Revenue";
import AdminAuditLog from "./pages/admin/AuditLog";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminPayouts from "./pages/admin/Payouts";
import AdminPartnerBalances from "./pages/admin/PartnerBalances";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Public marketing site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/impact" element={<PublicImpact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Consumer portal */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute roles={["CONSUMER"]}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<ConsumerDashboard />} />
            <Route path="addresses" element={<ConsumerAddresses />} />
            <Route path="new-request" element={<ConsumerNewRequest />} />
            <Route path="requests" element={<ConsumerRequests />} />
            <Route path="requests/:id" element={<ConsumerRequestDetail />} />
            <Route path="requests/:id/certificate" element={<ConsumerCertificate />} />
            <Route path="impact" element={<ConsumerImpact />} />
            <Route path="support" element={<Support />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Pickup partner portal */}
          <Route
            path="/partner"
            element={
              <ProtectedRoute roles={["PARTNER"]}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<PartnerDashboard />} />
            <Route path="assignments" element={<PartnerAssignments />} />
            <Route path="requests/:id" element={<PartnerRequestDetail />} />
            <Route path="history" element={<PartnerHistory />} />
            <Route path="earnings" element={<PartnerEarnings />} />
            <Route path="support" element={<Support />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Segregation centre portal */}
          <Route
            path="/centre"
            element={
              <ProtectedRoute roles={["CENTRE"]}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<CentreDashboard />} />
            <Route path="incoming" element={<CentreIncoming />} />
            <Route path="active" element={<CentreActive />} />
            <Route path="inventory" element={<CentreInventory />} />
            <Route path="history" element={<CentreHistory />} />
            <Route path="requests/:id" element={<CentreRequestDetail />} />
            <Route path="support" element={<Support />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin console */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="partner-balances" element={<AdminPartnerBalances />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
}
