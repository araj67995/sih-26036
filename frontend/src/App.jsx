import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicCertificateVerification from './pages/PublicCertificateVerification';
import NotFound from './pages/NotFound';

// Applicant Pages
import ApplicantDashboard from './pages/applicant/ApplicantDashboard';
import Instruments from './pages/applicant/Instruments';
import Applications from './pages/applicant/Applications';
import NewApplication from './pages/applicant/NewApplication';
import ApplicationDetails from './pages/applicant/ApplicationDetails';
import Certificates from './pages/applicant/Certificates';
import BusinessProfile from './pages/applicant/BusinessProfile';

// Officer Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import AssignedApplications from './pages/officer/AssignedApplications';
import InspectionForm from './pages/officer/InspectionForm';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminApplications from './pages/admin/AdminApplications';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminTestCentres from './pages/admin/AdminTestCentres';
import AdminReports from './pages/admin/AdminReports';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Portal Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<PublicCertificateVerification />} />
            <Route path="/verify/:certificateNumber" element={<PublicCertificateVerification />} />
          </Route>

          {/* Applicant Protected Routes */}
          <Route
            path="/applicant"
            element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/applicant/dashboard" replace />} />
            <Route path="dashboard" element={<ApplicantDashboard />} />
            <Route path="instruments" element={<Instruments />} />
            <Route path="applications" element={<Applications />} />
            <Route path="applications/new" element={<NewApplication />} />
            <Route path="applications/:id" element={<ApplicationDetails />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="business" element={<BusinessProfile />} />
          </Route>

          {/* Officer Protected Routes */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/officer/dashboard" replace />} />
            <Route path="dashboard" element={<OfficerDashboard />} />
            <Route path="applications" element={<AssignedApplications />} />
            <Route path="applications/:id/inspect" element={<InspectionForm />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="test-centres" element={<AdminTestCentres />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* 404 Fallback */}
          <Route element={<MainLayout />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
