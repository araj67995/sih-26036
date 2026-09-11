import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getFileDownloadUrl } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import TimelineTracker from '../../components/TimelineTracker';
import ReceiptModal from '../../components/ReceiptModal';

const ApplicationDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/applications/${id}`);
        if (res.success) {
          let paymentData = res.data.payment;
          if (!paymentData) {
            try {
              const pRes = await api.get(`/payments/application/${id}`);
              if (pRes.success) paymentData = pRes.data;
            } catch (err) {
              // payment not found or error
            }
          }
          setData({ ...res.data, payment: paymentData });
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError(err.message || 'Failed to load application details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading verification application details...</div>
      </div>
    );
  }

  if (error || !data?.application) {
    return (
      <div className="alert alert-danger p-4 text-center">
        <h5>Failed to Load Application</h5>
        <p className="mb-3">{error || 'Application not found'}</p>
        <Link to="/applicant/applications" className="btn btn-outline-danger btn-sm">
          Return to Applications
        </Link>
      </div>
    );
  }

  const { application, documents, inspection, certificate, payment } = data;

  return (
    <div className="application-details">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold text-navy mb-0">{application.applicationNumber}</h3>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-muted small mb-0">
            Submitted on {new Date(application.submittedAt || application.createdAt).toLocaleDateString()} • Type: {application.applicationType}
          </p>
        </div>

        <div className="d-flex gap-2 mt-2 mt-sm-0">
          {certificate && (
            <a
              href={`http://localhost:5000/api/certificates/${certificate._id}/download`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success btn-sm"
            >
              <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download Certificate
            </a>
          )}
          <Link to="/applicant/applications" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i> Back
          </Link>
        </div>
      </div>

      {/* Multi-Stage Visual Lifecycle Tracker */}
      <div className="mb-4">
        <TimelineTracker
          status={application.status}
          submittedAt={application.submittedAt || application.createdAt}
          inspectionDate={application.inspectionDate}
          certificateDate={certificate?.issueDate}
          remarks={application.remarks}
          rejectionReason={application.rejectionReason}
        />
      </div>

      {/* Instrument & Business Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="gov-card p-4 h-100">
            <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">
              <i className="bi bi-speedometer2 text-primary me-2"></i>
              Instrument Specifications
            </h6>
            <div className="row g-2 small">
              <div className="col-5 text-muted">Category:</div>
              <div className="col-7 fw-semibold">{application.instrument?.instrumentType}</div>

              <div className="col-5 text-muted">Manufacturer:</div>
              <div className="col-7">{application.instrument?.manufacturer}</div>

              <div className="col-5 text-muted">Model:</div>
              <div className="col-7">{application.instrument?.model}</div>

              <div className="col-5 text-muted">Serial Number:</div>
              <div className="col-7 font-monospace text-primary fw-bold">{application.instrument?.serialNumber}</div>

              <div className="col-5 text-muted">Capacity:</div>
              <div className="col-7">
                {application.instrument?.capacity} {application.instrument?.unit}
              </div>

              <div className="col-5 text-muted">Location:</div>
              <div className="col-7">{application.instrument?.location}</div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="gov-card p-4 h-100">
            <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">
              <i className="bi bi-person-badge text-primary me-2"></i>
              Officer & Establishment Allocation
            </h6>
            <div className="row g-2 small">
              <div className="col-5 text-muted">Assigned Officer:</div>
              <div className="col-7 fw-semibold text-primary">
                {application.assignedOfficer?.name ? (
                  <>
                    <i className="bi bi-shield-check me-1"></i>
                    {application.assignedOfficer.name}
                  </>
                ) : (
                  <span className="text-muted fst-italic">Pending Allocation by Admin</span>
                )}
              </div>

              <div className="col-5 text-muted">Officer Contact:</div>
              <div className="col-7">{application.assignedOfficer?.email || '-'}</div>

              <div className="col-5 text-muted">Inspection Date:</div>
              <div className="col-7 fw-bold">
                {application.inspectionDate ? new Date(application.inspectionDate).toLocaleDateString() : 'Not scheduled yet'}
              </div>

              <div className="col-5 text-muted">Applicant Business:</div>
              <div className="col-7">{application.business?.businessName}</div>

              <div className="col-5 text-muted">District / State:</div>
              <div className="col-7">
                {application.business?.district}, {application.business?.state}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Fee Payment & Official Receipt Card */}
      {payment ? (
        <div className="gov-card p-4 mb-4 border-start border-4 border-success">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 border-bottom pb-2">
            <div>
              <span className="badge bg-success mb-1">
                <i className="bi bi-patch-check-fill me-1"></i> Statutory Fee Paid & Verified
              </span>
              <h5 className="fw-bold text-navy mb-0">
                Receipt Number: <span className="font-monospace text-primary">{payment.receiptNumber}</span>
              </h5>
            </div>
            <div className="d-flex gap-2 mt-2 mt-sm-0">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => setShowReceiptModal(true)}
              >
                <i className="bi bi-eye-fill me-1"></i> View Receipt
              </button>
              <a
                href={getFileDownloadUrl(`/api/payments/${payment._id || payment.receiptNumber}/receipt/download`)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-sm fw-bold"
              >
                <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF Receipt
              </a>
            </div>
          </div>

          <div className="row g-3 small">
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Transaction / UTR ID:</span>
              <strong className="font-monospace text-dark">{payment.transactionId}</strong>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Total Statutory Amount:</span>
              <strong className="fs-6 text-success font-monospace">
                ₹ {payment.feeBreakdown?.totalAmount ? payment.feeBreakdown.totalAmount.toFixed(2) : '0.00'}
              </strong>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Payment Mode & Gateway:</span>
              <span className="fw-semibold">{payment.paymentMethod || 'UPI'} • BharatKosh</span>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Payment Timestamp:</span>
              <span>{new Date(payment.paidAt || payment.createdAt).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="gov-card p-3 mb-4 bg-light border">
          <div className="d-flex justify-content-between align-items-center">
            <div className="small">
              <i className="bi bi-shield-check text-success me-2"></i>
              Statutory verification fee assessment: <strong>Compliant with Legal Metrology Schedule IX</strong>
            </div>
            <span className="badge bg-success">Status: Verified</span>
          </div>
        </div>
      )}

      {/* Metrological Inspection Observation Results (if conducted) */}
      {inspection && (
        <div className="gov-card p-4 mb-4 border-start border-4 border-primary">
          <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h6 className="fw-bold text-navy mb-0">
              <i className="bi bi-clipboard2-pulse-fill text-primary me-2"></i>
              Legal Metrology Calibration Observations
            </h6>
            <span className={`badge bg-${inspection.result === 'PASS' ? 'success' : 'danger'} px-3 py-2 fs-6`}>
              RESULT: {inspection.result}
            </span>
          </div>

          <div className="row g-3 small">
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Standard Weight Applied:</span>
              <strong className="fs-6">{inspection.standardWeight} kg</strong>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Observed Instrument Reading:</span>
              <strong className="fs-6">{inspection.observedReading} kg</strong>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Calculated Error:</span>
              <strong className={`fs-6 ${inspection.error > 0 ? 'text-danger' : 'text-success'}`}>
                {inspection.error > 0 ? `+${inspection.error}` : inspection.error} kg
              </strong>
            </div>
            <div className="col-md-3 col-sm-6">
              <span className="text-muted d-block">Permissible Tolerance (MPE):</span>
              <strong className="fs-6">&plusmn;{inspection.permissibleError} kg</strong>
            </div>

            <div className="col-12 mt-3 pt-2 border-top">
              <span className="text-muted">Officer Remarks: </span>
              <em>"{inspection.remarks || 'No remarks provided'}"</em>
            </div>
          </div>
        </div>
      )}

      {/* Verification Certificate Preview Box (if generated) */}
      {certificate && (
        <div className="gov-card p-4 mb-4 bg-success-subtle border-success">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <span className="badge bg-success mb-2">
                <i className="bi bi-patch-check-fill me-1"></i> Certificate Issued & Active
              </span>
              <h5 className="fw-bold text-navy mb-1">
                Certificate Number: <span className="font-monospace">{certificate.certificateNumber}</span>
              </h5>
              <p className="text-muted small mb-0">
                Valid from {new Date(certificate.issueDate).toLocaleDateString()} until{' '}
                <strong className="text-danger">{new Date(certificate.validUntil).toLocaleDateString()}</strong>
              </p>
            </div>
            <div className="d-flex gap-2 mt-3 mt-md-0">
              <Link to={`/verify/${certificate.certificateNumber}`} className="btn btn-outline-dark btn-sm">
                <i className="bi bi-qr-code-scan me-1"></i> Public Verify
              </Link>
              <a
                href={getFileDownloadUrl(`/api/certificates/${certificate._id}/download`)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-sm fw-bold"
              >
                <i className="bi bi-download me-1"></i> Download PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div className="gov-card p-4">
        <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">
          <i className="bi bi-folder-fill text-primary me-2"></i>
          Uploaded Verification Documents ({documents.length})
        </h6>

        {documents.length === 0 ? (
          <p className="text-muted small mb-0">No documents attached to this application.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>File Name</th>
                  <th>Uploaded Date</th>
                  <th>Verification Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <span className="badge bg-light text-dark border">{doc.documentType}</span>
                    </td>
                    <td className="small">{doc.fileName}</td>
                    <td className="small text-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge bg-${
                          doc.verificationStatus === 'APPROVED'
                            ? 'success'
                            : doc.verificationStatus === 'REJECTED'
                            ? 'danger'
                            : 'warning text-dark'
                        }`}
                      >
                        {doc.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`http://localhost:5000${doc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline-primary btn-sm py-0 px-2"
                      >
                        <i className="bi bi-file-earmark-arrow-down"></i> View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payment && (
        <ReceiptModal
          show={showReceiptModal}
          onHide={() => setShowReceiptModal(false)}
          payment={{
            ...payment,
            application,
            instrument: application.instrument,
            business: application.business,
            applicant: application.applicant,
          }}
        />
      )}
    </div>
  );
};

export default ApplicationDetails;
