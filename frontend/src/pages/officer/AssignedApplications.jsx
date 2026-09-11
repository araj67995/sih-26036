import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getFileDownloadUrl } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AssignedApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  // Document state
  const [appDocuments, setAppDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

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

  const fetchDocsForApp = async (appId) => {
    try {
      setLoadingDocs(true);
      const res = await api.get(`/applications/${appId}/documents`);
      if (res.success) {
        setAppDocuments(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load application documents:', err);
      setAppDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpdateDocStatus = async (docId, newStatus) => {
    try {
      let reason = '';
      if (newStatus === 'REJECTED') {
        reason = window.prompt(
          'Enter reason for document rejection (this will mark the entire application as DOCUMENT_REJECTED):',
          'Document illegible, invalid, or does not satisfy legal metrology standards'
        );
        if (reason === null) return; // Officer cancelled
      }

      const res = await api.put(`/officer/documents/${docId}/status`, { status: newStatus, reason });
      if (res.success) {
        setAppDocuments((prev) =>
          prev.map((d) => (d._id === docId ? { ...d, verificationStatus: newStatus } : d))
        );

        if (newStatus === 'REJECTED') {
          fetchApplications();
          setAlert({
            type: 'danger',
            message: `Document rejected. Application ${selectedApp?.applicationNumber} has been updated to DOCUMENT_REJECTED.`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to update document status:', err);
    }
  };

  const handleApproveAllDocs = async () => {
    for (const doc of appDocuments) {
      if (doc.verificationStatus !== 'APPROVED') {
        await handleUpdateDocStatus(doc._id, 'APPROVED');
      }
    }
  };

  const openReview = (app) => {
    setSelectedApp(app);
    setReviewAction('APPROVE');
    setReviewRemarks('Documents scrutinized and found compliant with Legal Metrology requirements.');
    setRejectionReason('');
    setAppDocuments([]);
    setShowReviewModal(true);
    fetchDocsForApp(app._id);
  };

  const openDocViewer = (app) => {
    setSelectedApp(app);
    setAppDocuments([]);
    setShowDocModal(true);
    fetchDocsForApp(app._id);
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

                        {/* Always visible View Documents button */}
                        <button
                          className="btn btn-outline-secondary btn-sm py-1 px-2"
                          onClick={() => openDocViewer(app)}
                          title="View attached applicant documents"
                        >
                          <i className="bi bi-folder2-open me-1"></i> Docs
                        </button>
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
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
                  {/* Uploaded Documents List for Scrutiny */}
                  <div className="mb-4 p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold text-navy mb-0">
                        <i className="bi bi-folder2-open text-primary me-2"></i>
                        Attached Applicant Documents ({appDocuments.length})
                      </h6>
                      <span className="small text-muted">Click to inspect original file</span>
                    </div>

                    {loadingDocs ? (
                      <div className="text-center py-3 text-muted small">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        Retrieving uploaded documents from server...
                      </div>
                    ) : appDocuments.length === 0 ? (
                      <div className="alert alert-warning py-2 px-3 small mb-0">
                        <i className="bi bi-exclamation-triangle me-1"></i> No documents attached to this application.
                      </div>
                    ) : (
                      <div className="list-group list-group-flush rounded border bg-white">
                        {appDocuments.map((doc) => (
                          <div
                            key={doc._id}
                            className="list-group-item d-flex flex-wrap justify-content-between align-items-center py-2 px-3 gap-2"
                          >
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                                {doc.documentType}
                              </span>
                              <div>
                                <div className="small fw-semibold text-truncate" style={{ maxWidth: '280px' }}>
                                  {doc.fileName || 'Uploaded Attachment'}
                                </div>
                                <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  Uploaded: {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {doc.verificationStatus === 'APPROVED' ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-check-circle-fill me-1"></i> APPROVED
                                </span>
                              ) : doc.verificationStatus === 'REJECTED' ? (
                                <span className="badge bg-danger">
                                  <i className="bi bi-x-circle-fill me-1"></i> REJECTED
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  <i className="bi bi-clock-history me-1"></i> PENDING
                                </span>
                              )}
                              <a
                                href={getFileDownloadUrl(doc.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline-primary btn-sm py-1 px-2 fw-semibold"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i> View
                              </a>
                              {doc.verificationStatus !== 'APPROVED' && (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm py-1 px-2"
                                  onClick={() => handleUpdateDocStatus(doc._id, 'APPROVED')}
                                  title="Approve this document"
                                >
                                  <i className="bi bi-check-lg"></i>
                                </button>
                              )}
                              {doc.verificationStatus === 'PENDING' && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm py-1 px-2"
                                  onClick={() => handleUpdateDocStatus(doc._id, 'REJECTED')}
                                  title="Reject this document"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                          disabled={appDocuments.length > 0 && appDocuments.every((d) => d.verificationStatus === 'APPROVED')}
                          className="form-check-input"
                        />
                        <label
                          htmlFor="revReject"
                          className={`form-check-label fw-bold ${
                            appDocuments.length > 0 && appDocuments.every((d) => d.verificationStatus === 'APPROVED')
                              ? 'text-muted'
                              : 'text-danger'
                          }`}
                        >
                          Reject Documents
                        </label>
                      </div>
                    </div>
                    {appDocuments.length > 0 && appDocuments.every((d) => d.verificationStatus === 'APPROVED') && (
                      <small className="text-success d-block mt-1">
                        <i className="bi bi-shield-check me-1"></i>
                        All attached documents are verified. Rejection option is disabled.
                      </small>
                    )}
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

      {/* Standalone View Documents Modal */}
      {showDocModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-folder2-open text-primary me-2"></i>
                  Verification Documents: {selectedApp?.applicationNumber}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDocModal(false)}></button>
              </div>

              <div className="modal-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="text-muted small">Applicant: </span>
                    <strong className="text-dark">{selectedApp?.applicant?.name}</strong>
                    <span className="text-muted small"> ({selectedApp?.business?.businessName})</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {appDocuments.some((d) => d.verificationStatus !== 'APPROVED') && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success fw-semibold"
                        onClick={handleApproveAllDocs}
                      >
                        <i className="bi bi-check-all me-1"></i> Approve All
                      </button>
                    )}
                    <span className="badge bg-light text-dark border">
                      Instrument: {selectedApp?.instrument?.model} (SN: {selectedApp?.instrument?.serialNumber})
                    </span>
                  </div>
                </div>

                {loadingDocs ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    <span className="text-muted small">Loading documents from MongoDB...</span>
                  </div>
                ) : appDocuments.length === 0 ? (
                  <div className="alert alert-info py-3 px-3 small mb-0">
                    <i className="bi bi-info-circle me-1"></i> No documents uploaded for this application.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Document Type</th>
                          <th>File Name</th>
                          <th>Upload Date</th>
                          <th>Status</th>
                          <th className="text-end">Action Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appDocuments.map((doc) => (
                          <tr key={doc._id}>
                            <td>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                                {doc.documentType}
                              </span>
                            </td>
                            <td className="small fw-semibold">{doc.fileName || 'Attached Document'}</td>
                            <td className="small text-muted">
                              {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              {doc.verificationStatus === 'APPROVED' ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-check-circle-fill me-1"></i> APPROVED
                                </span>
                              ) : doc.verificationStatus === 'REJECTED' ? (
                                <span className="badge bg-danger">
                                  <i className="bi bi-x-circle-fill me-1"></i> REJECTED
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  <i className="bi bi-clock-history me-1"></i> PENDING
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-1">
                                <a
                                  href={getFileDownloadUrl(doc.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-primary py-1 px-2 fw-semibold"
                                >
                                  <i className="bi bi-box-arrow-up-right me-1"></i> View
                                </a>
                                {doc.verificationStatus !== 'APPROVED' && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success py-1 px-2"
                                    onClick={() => handleUpdateDocStatus(doc._id, 'APPROVED')}
                                    title="Approve this document"
                                  >
                                    <i className="bi bi-check-lg me-1"></i> Approve
                                  </button>
                                )}
                                {doc.verificationStatus === 'PENDING' && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger py-1 px-2"
                                    onClick={() => handleUpdateDocStatus(doc._id, 'REJECTED')}
                                    title="Reject this document"
                                  >
                                    <i className="bi bi-x-lg me-1"></i> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDocModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedApplications;
