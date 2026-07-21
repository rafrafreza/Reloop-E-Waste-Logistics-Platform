import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import AppShell from "./components/layout/AppShell";

import Home from "./pages/public/Home";
import HowItWorks from "./pages/public/HowItWorks";
import Pricing from "./pages/public/Pricing";
import FAQ from "./pages/public/FAQ";
import Contact from "./pages/public/Contact";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

import ConsumerDashboard from "./pages/consumer/Dashboard";
import ConsumerAddresses from "./pages/consumer/Addresses";
import ConsumerNewRequest from "./pages/consumer/NewRequest";
import ConsumerRequests from "./pages/consumer/Requests";
import ConsumerRequestDetail from "./pages/consumer/RequestDetail";

import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerAssignments from "./pages/partner/Assignments";
import PartnerRequestDetail from "./pages/partner/RequestDetail";
import PartnerHistory from "./pages/partner/History";

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public marketing site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
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
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
