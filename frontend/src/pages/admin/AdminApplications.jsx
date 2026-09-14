import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Assign / Reallocate Officer Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [candidateOfficers, setCandidateOfficers] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedOfficerUserId, setSelectedOfficerUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
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
      if (usersRes.success) setOfficers(usersRes.data);
    } catch (err) {
      console.error('Error fetching admin applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openAssign = async (app) => {
    setSelectedApp(app);
    setSelectedOfficerUserId(app.assignedOfficer?._id || '');
    setReassignReason('');
    setShowAssignModal(true);
    setCandidateOfficers([]);
    setLoadingCandidates(true);

    try {
      const res = await api.get(`/applications/${app._id}/allocation`);
      if (res.success && res.data?.officers) {
        setCandidateOfficers(res.data.officers);
        // Default to first eligible available officer if none currently assigned
        if (!app.assignedOfficer?._id && res.data.officers.length > 0) {
          const firstAvailable = res.data.officers.find((o) => o.isAvailable) || res.data.officers[0];
          setSelectedOfficerUserId(firstAvailable.userId || firstAvailable._id);
        }
      }
    } catch (err) {
      console.warn('Failed to load candidate officers:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleTriggerAutoAllocate = async () => {
    if (!selectedApp) return;
    try {
      setTriggeringAuto(true);
      const res = await api.post(`/applications/${selectedApp._id}/allocate`);
      if (res.success) {
        setShowAssignModal(false);
        setAlert({
          type: 'success',
          message: `Auto-allocation completed: ${res.data?.officer?.name ? `Officer ${res.data.officer.name} assigned` : res.message}`,
        });
        fetchData();
      } else {
        setAlert({ type: 'warning', message: res.message });
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Auto-allocation failed' });
    } finally {
      setTriggeringAuto(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignReason.trim() || reassignReason.trim().length < 5) {
      setAlert({ type: 'danger', message: 'A valid reason (minimum 5 characters) is required for officer reassignment.' });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const res = await api.put(`/admin/applications/${selectedApp._id}/assign`, {
        officerId: selectedOfficerUserId,
        reason: reassignReason.trim(),
      });

      if (res.success) {
        setShowAssignModal(false);
        setAlert({ type: 'success', message: res.message || 'Officer allocation updated successfully' });
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
                  <th>Assigned Officer & Distance</th>
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
                        <div>
                          <span className="fw-semibold text-navy">
                            <i className="bi bi-shield-check text-success me-1"></i>
                            {app.assignedOfficer.name}
                          </span>
                          <div className="d-flex align-items-center gap-1 mt-1">
                            {app.allocationDistance != null && (
                              <span
                                className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace"
                                style={{ fontSize: '0.72rem' }}
                              >
                                <i className="bi bi-pin-map-fill text-danger me-1"></i>
                                {app.allocationDistance >= 1000
                                  ? `${(app.allocationDistance / 1000).toFixed(1)} km`
                                  : `${Math.round(app.allocationDistance)} m`}
                              </span>
                            )}
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.7rem' }}>
                              {app.allocationMethod === 'AUTO_NEAREST' ? '⚡ Auto-Nearest' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          {app.allocationStatus === 'WAITING_FOR_ALLOCATION' ? 'Waiting in Queue' : 'Unassigned'}
                        </span>
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
                        <i className="bi bi-person-check me-1"></i> Reallocate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reallocate / Assign Officer Modal */}
      {showAssignModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-person-check text-primary me-2"></i>
                  Reallocate Officer: {selectedApp?.applicationNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body">
                  {/* Establishment & Location Summary */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="row g-2 small">
                      <div className="col-md-6">
                        <span className="text-muted d-block">Establishment & Business:</span>
                        <strong>{selectedApp?.business?.businessName}</strong> ({selectedApp?.business?.district})
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted d-block">Verification Address:</span>
                        <div className="text-truncate">
                          {[
                            selectedApp?.verificationLocation?.address?.buildingName,
                            selectedApp?.verificationLocation?.address?.city,
                            selectedApp?.verificationLocation?.address?.district,
                            selectedApp?.verificationLocation?.address?.state,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Address on record'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-allocation trigger shortcut */}
                  <div className="d-flex justify-content-between align-items-center p-2 mb-3 bg-primary-subtle border border-primary-subtle rounded">
                    <div className="small">
                      <i className="bi bi-cpu-fill text-primary me-1"></i>
                      <strong>Need automatic assignment?</strong> Runs $geoNear against candidate officers.
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm fw-bold"
                      disabled={triggeringAuto}
                      onClick={handleTriggerAutoAllocate}
                    >
                      {triggeringAuto ? 'Calculating Nearest...' : '⚡ Trigger Auto-Nearest'}
                    </button>
                  </div>

                  {/* Candidate Officers Ranking List */}
                  <div className="mb-3">
                    <label className="form-label fw-bold text-navy d-flex justify-content-between align-items-center">
                      <span>Select Legal Metrology Officer (Ranked by Proximity) *</span>
                      <small className="text-muted fw-normal">Haversine spherical distance</small>
                    </label>

                    {loadingCandidates ? (
                      <div className="text-center py-4 bg-light rounded border">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        <span className="text-muted small">Computing nearest officer candidates...</span>
                      </div>
                    ) : candidateOfficers.length > 0 ? (
                      <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {candidateOfficers.map((off, index) => (
                          <label
                            key={off._id}
                            className={`p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer ${
                              selectedOfficerUserId === (off.userId || off._id)
                                ? 'border-primary bg-primary-subtle'
                                : 'bg-white'
                            }`}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <input
                                type="radio"
                                name="officerChoice"
                                value={off.userId || off._id}
                                checked={selectedOfficerUserId === (off.userId || off._id)}
                                onChange={() => setSelectedOfficerUserId(off.userId || off._id)}
                                className="form-check-input mt-0"
                              />
                              <div>
                                <div className="fw-bold text-dark">
                                  {off.name}
                                  {off.officeName && (
                                    <span className="text-muted fw-normal small ms-2">({off.officeName})</span>
                                  )}
                                </div>
                                <div className="small text-muted">
                                  {off.email} • {off.district || off.state || 'Headquarters'}
                                </div>
                              </div>
                            </div>

                            <div className="text-end">
                              <div className="badge bg-primary font-monospace fs-6">
                                #{index + 1} • {off.distanceFormatted || 'Nearby'}
                              </div>
                              <div className="mt-1 d-flex gap-1 justify-content-end">
                                <span
                                  className={`badge ${
                                    off.isWithinServiceArea ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
                                  }`}
                                  style={{ fontSize: '0.68rem' }}
                                >
                                  {off.isWithinServiceArea ? `Within ${off.serviceRadius || 50}km` : 'Out of Radius'}
                                </span>
                                <span
                                  className={`badge ${
                                    off.isAvailable ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'
                                  }`}
                                  style={{ fontSize: '0.68rem' }}
                                >
                                  {off.availabilityStatus || 'AVAILABLE'}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select
                        className="form-select"
                        value={selectedOfficerUserId}
                        onChange={(e) => setSelectedOfficerUserId(e.target.value)}
                        required
                      >
                        {officers.map((off) => (
                          <option key={off._id} value={off._id}>
                            {off.name} ({off.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Mandatory Reassignment Reason */}
                  <div className="mb-3">
                    <label className="form-label fw-bold text-navy">
                      Justification Reason for Administrative Override / Reassignment <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="State mandatory reason for reassignment (e.g. Officer on field leave, workload rebalancing, specialized testing equipment capacity)..."
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      required
                    ></textarea>
                    <small className="text-muted">
                      Mandatory under Legal Metrology audit rules. Recorded in permanent audit logs.
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-gov-primary btn-sm fw-bold"
                    disabled={submitting || !selectedOfficerUserId || !reassignReason.trim()}
                  >
                    {submitting ? 'Reallocating...' : 'Confirm Reallocation'}
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
