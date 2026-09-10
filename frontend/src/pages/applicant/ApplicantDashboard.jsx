import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalInstruments: 0,
    activeApplications: 0,
    pendingApplications: 0,
    completedApplications: 0,
    validCertificates: 0,
    expiringCertificates: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          api.get('/applications/stats/applicant'),
          api.get('/applications'),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (appsRes.success) setRecentApplications(appsRes.data.slice(0, 5));
      } catch (err) {
        console.error('Error loading applicant dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="applicant-dashboard">
      {/* Welcome Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">
            Welcome, {user?.name}
          </h3>
          <p className="text-muted small mb-0">
            <i className="bi bi-building me-1"></i>
            {user?.business?.businessName || 'Commercial Establishment'} • Legal Metrology Portal
          </p>
        </div>
        <div className="d-flex gap-2 mt-2 mt-sm-0">
          <Link to="/applicant/instruments" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-speedometer me-1"></i> View Instruments
          </Link>
          <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm">
            <i className="bi bi-plus-circle me-1"></i> New Application
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-semibold">Registered Instruments</small>
                <h3 className="fw-bold text-navy mt-1 mb-0">{loading ? '...' : stats.totalInstruments}</h3>
              </div>
              <div className="bg-primary-subtle text-primary p-3 rounded">
                <i className="bi bi-speedometer2 fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-warning">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-semibold">Active In-Progress</small>
                <h3 className="fw-bold text-warning mt-1 mb-0">{loading ? '...' : stats.activeApplications}</h3>
              </div>
              <div className="bg-warning-subtle text-warning p-3 rounded">
                <i className="bi bi-hourglass-split fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-success">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-semibold">Valid Certificates</small>
                <h3 className="fw-bold text-success mt-1 mb-0">{loading ? '...' : stats.validCertificates}</h3>
              </div>
              <div className="bg-success-subtle text-success p-3 rounded">
                <i className="bi bi-patch-check-fill fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications Section */}
      <div className="gov-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-navy mb-0">Recent Verification Applications</h5>
          <Link to="/applicant/applications" className="small text-primary text-decoration-none fw-semibold">
            View All Applications <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span className="ms-2 text-muted small">Loading records from MongoDB...</span>
          </div>
        ) : recentApplications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox display-6 d-block mb-2"></i>
            No verification applications submitted yet.
            <div className="mt-3">
              <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm">
                Submit Your First Application
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Application No</th>
                  <th>Instrument</th>
                  <th>Serial Number</th>
                  <th>Date Submitted</th>
                  <th>Current Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app._id}>
                    <td className="fw-bold text-primary font-monospace">{app.applicationNumber}</td>
                    <td>{app.instrument?.model || app.instrument?.instrumentType}</td>
                    <td className="font-monospace text-muted">{app.instrument?.serialNumber}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <Link
                        to={`/applicant/applications/${app._id}`}
                        className="btn btn-outline-primary btn-sm py-1 px-2"
                      >
                        <i className="bi bi-eye me-1"></i> Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantDashboard;
