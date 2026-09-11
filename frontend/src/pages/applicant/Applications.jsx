import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/applications?status=${statusFilter}` : '/applications';
      const res = await api.get(url);
      if (res.success) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  return (
    <div className="applicant-applications">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">Verification Applications</h3>
          <p className="text-muted small mb-0">
            Track statutory verification applications submitted to the Legal Metrology Department
          </p>
        </div>
        <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm mt-2 mt-sm-0">
          <i className="bi bi-plus-circle me-1"></i> Apply for Verification
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded border mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted fw-bold">Filter Status:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '220px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DOCUMENT_VERIFICATION">Document Verification</option>
            <option value="APPROVED_FOR_INSPECTION">Approved for Inspection</option>
            <option value="INSPECTION_SCHEDULED">Inspection Scheduled</option>
            <option value="INSPECTION_COMPLETED">Inspection Completed</option>
            <option value="CERTIFICATE_ISSUED">Certificate Issued</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <span className="small text-muted font-monospace">Total: {applications.length} Records</span>
      </div>

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span className="ms-2 text-muted small">Loading applications from MongoDB...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox display-6 d-block mb-2"></i>
            No applications found matching the selected criteria.
            <div className="mt-3">
              <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm">
                Submit New Application
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Application Number</th>
                  <th>Instrument</th>
                  <th>Serial Number</th>
                  <th>Type</th>
                  <th>Assigned Officer</th>
                  <th>Statutory Fee</th>
                  <th>Date Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td className="fw-bold text-primary font-monospace">{app.applicationNumber}</td>
                    <td>{app.instrument?.model || app.instrument?.instrumentType}</td>
                    <td className="font-monospace text-muted">{app.instrument?.serialNumber}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{app.applicationType}</span>
                    </td>
                    <td>{app.assignedOfficer?.name || <span className="text-muted fst-italic">Pending Allocation</span>}</td>
                    <td>
                      {app.payment?.feeBreakdown?.totalAmount ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace">
                          <i className="bi bi-check-circle me-1"></i>
                          ₹{app.payment.feeBreakdown.totalAmount}
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="bi bi-check-circle me-1"></i> PAID
                        </span>
                      )}
                    </td>
                    <td>{new Date(app.submittedAt || app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <Link
                        to={`/applicant/applications/${app._id}`}
                        className="btn btn-outline-primary btn-sm py-1 px-3"
                      >
                        <i className="bi bi-eye me-1"></i> Details & Track
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

export default Applications;
