import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Assign Officer Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/admin/applications?status=${statusFilter}` : '/admin/applications';
      const [appsRes, usersRes] = await Promise.all([
        api.get(url),
        api.get('/admin/users?role=officer'),
      ]);

      if (appsRes.success) setApplications(appsRes.data);
      if (usersRes.success) {
        setOfficers(usersRes.data);
        if (usersRes.data.length > 0) {
          setSelectedOfficerId(usersRes.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching admin applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openAssign = (app) => {
    setSelectedApp(app);
    setSelectedOfficerId(app.assignedOfficer?._id || (officers[0] ? officers[0]._id : ''));
    setAssignRemarks('Assigned by State Administrator for statutory verification.');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await api.put(`/admin/applications/${selectedApp._id}/assign`, {
        officerId: selectedOfficerId,
        remarks: assignRemarks,
      });

      if (res.success) {
        setShowAssignModal(false);
        setAlert({ type: 'success', message: res.message });
        fetchData();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Error assigning officer' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-applications">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">District Applications Oversight</h3>
          <p className="text-muted small mb-0">
            Monitor state-wide verification workload and reallocate applications between field officers
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show py-2 px-3 small mb-3`} role="alert">
          {alert.message}
          <button type="button" className="btn-close py-2" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded border mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted fw-bold">Filter By Status:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '220px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Applications</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DOCUMENT_VERIFICATION">Document Verification</option>
            <option value="APPROVED_FOR_INSPECTION">Approved for Inspection</option>
            <option value="INSPECTION_SCHEDULED">Inspection Scheduled</option>
            <option value="INSPECTION_COMPLETED">Inspection Completed</option>
            <option value="CERTIFICATE_ISSUED">Certificate Issued</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <span className="small text-muted font-monospace">Total Records: {applications.length}</span>
      </div>

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="ms-2 text-muted small">Loading all state records from MongoDB...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox display-6 d-block mb-2"></i>
            No applications found for this filter.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Application No</th>
                  <th>Establishment</th>
                  <th>Instrument</th>
                  <th>Assigned Officer</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td className="fw-bold text-primary font-monospace">{app.applicationNumber}</td>
                    <td>
                      <div className="fw-semibold">{app.business?.businessName}</div>
                      <small className="text-muted">{app.business?.district}</small>
                    </td>
                    <td>
                      <div>{app.instrument?.model}</div>
                      <small className="font-monospace text-muted">SN: {app.instrument?.serialNumber}</small>
                    </td>
                    <td>
                      {app.assignedOfficer ? (
                        <span className="fw-semibold text-navy">
                          <i className="bi bi-shield-check text-success me-1"></i>
                          {app.assignedOfficer.name}
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="small">{new Date(app.submittedAt || app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm py-1 px-2"
                        onClick={() => openAssign(app)}
                      >
                        <i className="bi bi-person-check me-1"></i> Allocate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Officer Modal */}
      {showAssignModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-person-check text-primary me-2"></i>
                  Allocate Officer: {selectedApp?.applicationNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Establishment:</label>
                    <div className="fw-bold">{selectedApp?.business?.businessName} ({selectedApp?.business?.district})</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Select Legal Metrology Officer *</label>
                    <select
                      className="form-select"
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      required
                    >
                      {officers.map((off) => (
                        <option key={off._id} value={off._id}>
                          {off.name} ({off.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Administrator Remarks / Assignment Instructions</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={assignRemarks}
                      onChange={(e) => setAssignRemarks(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gov-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Assigning...' : 'Confirm Officer Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
