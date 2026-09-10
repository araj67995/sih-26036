import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assignedApplications: 0,
    pendingReview: 0,
    scheduledInspections: 0,
    completedInspections: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
  });
  const [urgentApps, setUrgentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfficerData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          api.get('/officer/stats'),
          api.get('/officer/applications'),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (appsRes.success) {
          // Priority items needing action (submitted, doc verification, scheduled)
          const priority = appsRes.data.filter((a) =>
            ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'APPROVED_FOR_INSPECTION', 'INSPECTION_SCHEDULED'].includes(a.status)
          );
          setUrgentApps(priority.slice(0, 6));
        }
      } catch (err) {
        console.error('Error fetching officer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficerData();
  }, []);

  return (
    <div className="officer-dashboard">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">Inspector Officer Dashboard</h3>
          <p className="text-muted small mb-0">
            Welcome, <strong>{user?.name}</strong> • Legal Metrology Division Inspector Console
          </p>
        </div>
        <Link to="/officer/applications" className="btn btn-gov-primary btn-sm mt-2 mt-sm-0">
          <i className="bi bi-clipboard-check me-1"></i> View Assigned Queue
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-primary">
            <small className="text-muted text-uppercase fw-semibold">Total Assigned</small>
            <h3 className="fw-bold text-navy mt-1 mb-0">{loading ? '...' : stats.assignedApplications}</h3>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-warning">
            <small className="text-muted text-uppercase fw-semibold">Pending Review</small>
            <h3 className="fw-bold text-warning mt-1 mb-0">{loading ? '...' : stats.pendingReview}</h3>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-info">
            <small className="text-muted text-uppercase fw-semibold">Scheduled Inspections</small>
            <h3 className="fw-bold text-info mt-1 mb-0">{loading ? '...' : stats.scheduledInspections}</h3>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-success">
            <small className="text-muted text-uppercase fw-semibold">Approved / Certified</small>
            <h3 className="fw-bold text-success mt-1 mb-0">{loading ? '...' : stats.approvedApplications}</h3>
          </div>
        </div>
      </div>

      {/* Action Queue */}
      <div className="gov-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold text-navy mb-0">Urgent Applications Awaiting Action</h5>
            <small className="text-muted">Applications requiring document scrutiny or field inspection</small>
          </div>
          <Link to="/officer/applications" className="small text-primary text-decoration-none fw-semibold">
            View Complete Queue <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="ms-2 text-muted small">Loading inspection queue from MongoDB...</span>
          </div>
        ) : urgentApps.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-check-circle-fill text-success display-5 d-block mb-2"></i>
            All assigned applications are up to date. No pending actions in your queue.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Application Number</th>
                  <th>Applicant Business</th>
                  <th>Instrument</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Inspection Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {urgentApps.map((app) => (
                  <tr key={app._id}>
                    <td className="fw-bold font-monospace text-primary">{app.applicationNumber}</td>
                    <td>
                      <div className="fw-semibold">{app.business?.businessName}</div>
                      <small className="text-muted">{app.applicant?.name}</small>
                    </td>
                    <td>
                      {app.instrument?.model}
                      <small className="d-block text-muted">
                        SN: {app.instrument?.serialNumber} ({app.instrument?.capacity} {app.instrument?.unit})
                      </small>
                    </td>
                    <td className="small text-muted">{app.business?.district}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="small">
                      {app.inspectionDate ? (
                        <span className="fw-bold text-primary font-monospace">
                          {new Date(app.inspectionDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted fst-italic">Not scheduled</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/officer/applications/${app._id}/inspect`}
                        className="btn btn-gov-primary btn-sm py-1 px-2"
                      >
                        <i className="bi bi-speedometer2 me-1"></i> Inspect & Verify
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

export default OfficerDashboard;
