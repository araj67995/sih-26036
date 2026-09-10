import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AssignedApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Review Form state
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Schedule Form state
  const [inspectionDate, setInspectionDate] = useState('');
  const [scheduleRemarks, setScheduleRemarks] = useState('');

  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [alert, setAlert] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/officer/applications?status=${statusFilter}` : '/officer/applications';
      const res = await api.get(url);
      if (res.success) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error('Failed to load officer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const openReview = (app) => {
    setSelectedApp(app);
    setReviewAction('APPROVE');
    setReviewRemarks('Documents scrutinized and found compliant with Legal Metrology requirements.');
    setRejectionReason('');
    setShowReviewModal(true);
  };

  const openSchedule = (app) => {
    setSelectedApp(app);
    // default inspection date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setInspectionDate(tomorrow.toISOString().split('T')[0]);
    setScheduleRemarks('Physical on-site calibration verification scheduled.');
    setShowScheduleModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setAlert(null);

    try {
      const res = await api.put(`/officer/applications/${selectedApp._id}/review`, {
        action: reviewAction,
        remarks: reviewRemarks,
        rejectionReason: reviewAction === 'REJECT' ? rejectionReason : undefined,
      });

      if (res.success) {
        setShowReviewModal(false);
        setAlert({ type: 'success', message: `Application status updated to ${res.data.status}` });
        fetchApplications();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Error processing review' });
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setAlert(null);

    try {
      const res = await api.put(`/officer/applications/${selectedApp._id}/schedule`, {
        inspectionDate,
        remarks: scheduleRemarks,
      });

      if (res.success) {
        setShowScheduleModal(false);
        setAlert({
          type: 'success',
          message: `Inspection scheduled for ${new Date(inspectionDate).toLocaleDateString()}`,
        });
        fetchApplications();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Error scheduling inspection' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="assigned-applications">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">Assigned Verification Queue</h3>
          <p className="text-muted small mb-0">
            Scrutinize documentation, schedule field calibrations, and perform statutory error verification
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
          <label className="small text-muted fw-bold">Filter By Stage:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '220px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Verification Stages</option>
            <option value="SUBMITTED">Submitted (New)</option>
            <option value="DOCUMENT_VERIFICATION">Under Document Scrutiny</option>
            <option value="APPROVED_FOR_INSPECTION">Approved For Inspection</option>
            <option value="INSPECTION_SCHEDULED">Inspection Scheduled</option>
            <option value="INSPECTION_COMPLETED">Inspection Completed</option>
            <option value="CERTIFICATE_ISSUED">Certificate Issued</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <span className="small text-muted font-monospace">Showing {applications.length} Applications</span>
      </div>

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="ms-2 text-muted small">Loading inspection cases from MongoDB...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-folder2-open display-6 d-block mb-2"></i>
            No applications found matching the selected stage.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Application Number</th>
                  <th>Establishment & Applicant</th>
                  <th>Instrument Details</th>
                  <th>Status</th>
                  <th>Inspection Date</th>
                  <th>Action Controls</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td className="fw-bold text-primary font-monospace">{app.applicationNumber}</td>
                    <td>
                      <div className="fw-semibold">{app.business?.businessName}</div>
                      <small className="text-muted">
                        {app.applicant?.name} • {app.business?.district}
                      </small>
                    </td>
                    <td>
                      <div>{app.instrument?.model} ({app.instrument?.instrumentType})</div>
                      <small className="font-monospace text-muted">
                        SN: {app.instrument?.serialNumber} • {app.instrument?.capacity} {app.instrument?.unit}
                      </small>
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="small font-monospace">
                      {app.inspectionDate ? new Date(app.inspectionDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {/* If in early review stages, show Scrutiny button */}
                        {['SUBMITTED', 'DOCUMENT_VERIFICATION'].includes(app.status) && (
                          <button
                            className="btn btn-outline-primary btn-sm py-1 px-2"
                            onClick={() => openReview(app)}
                          >
                            <i className="bi bi-file-earmark-check me-1"></i> Scrutinize
                          </button>
                        )}

                        {/* If approved for inspection, show Schedule button */}
                        {['APPROVED_FOR_INSPECTION'].includes(app.status) && (
                          <button
                            className="btn btn-warning btn-sm py-1 px-2 text-dark fw-semibold"
                            onClick={() => openSchedule(app)}
                          >
                            <i className="bi bi-calendar-event me-1"></i> Schedule
                          </button>
                        )}

                        {/* Inspect & Calculate button */}
                        <Link
                          to={`/officer/applications/${app._id}/inspect`}
                          className="btn btn-gov-primary btn-sm py-1 px-2"
                        >
                          <i className="bi bi-speedometer2 me-1"></i> Inspect
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Documents Modal */}
      {showReviewModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-file-earmark-check text-primary me-2"></i>
                  Document Scrutiny: {selectedApp?.applicationNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReviewModal(false)}></button>
              </div>

              <form onSubmit={handleReviewSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Review Decision *</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          type="radio"
                          id="revApprove"
                          name="reviewAction"
                          value="APPROVE"
                          checked={reviewAction === 'APPROVE'}
                          onChange={() => setReviewAction('APPROVE')}
                          className="form-check-input"
                        />
                        <label htmlFor="revApprove" className="form-check-label text-success fw-bold">
                          Approve for Physical Inspection
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          type="radio"
                          id="revReject"
                          name="reviewAction"
                          value="REJECT"
                          checked={reviewAction === 'REJECT'}
                          onChange={() => setReviewAction('REJECT')}
                          className="form-check-input"
                        />
                        <label htmlFor="revReject" className="form-check-label text-danger fw-bold">
                          Reject Documents
                        </label>
                      </div>
                    </div>
                  </div>

                  {reviewAction === 'REJECT' ? (
                    <div className="mb-3">
                      <label className="form-label text-danger fw-bold">Rejection Reason *</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="State clear reasons why documents were found non-compliant..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                      ></textarea>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Officer Remarks</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                      ></textarea>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowReviewModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${reviewAction === 'APPROVE' ? 'btn-success' : 'btn-danger'} btn-sm`}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : reviewAction === 'APPROVE' ? 'Approve for Inspection' : 'Reject Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Inspection Modal */}
      {showScheduleModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-calendar-event text-primary me-2"></i>
                  Schedule Field Inspection: {selectedApp?.applicationNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)}></button>
              </div>

              <form onSubmit={handleScheduleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Inspection Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Inspection Venue / Remarks</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={scheduleRemarks}
                      onChange={(e) => setScheduleRemarks(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning btn-sm fw-bold text-dark" disabled={processing}>
                    {processing ? 'Saving...' : 'Confirm Inspection Schedule'}
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

export default AssignedApplications;
