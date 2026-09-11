import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { getFileDownloadUrl } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const InspectionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [applicationData, setApplicationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inspection form state
  const [instrumentCondition, setInstrumentCondition] = useState('SATISFACTORY');
  const [serialNumberVerified, setSerialNumberVerified] = useState(true);
  const [sealCondition, setSealCondition] = useState('INTACT');
  const [standardWeight, setStandardWeight] = useState(20);
  const [observedReading, setObservedReading] = useState(20.02);
  const [permissibleError, setPermissibleError] = useState(0.05);
  const [remarks, setRemarks] = useState('Instrument verified compliant with Class III standards.');

  // Existing inspection if already conducted
  const [existingInspection, setExistingInspection] = useState(null);
  const [issuedCertificate, setIssuedCertificate] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/officer/applications/${id}`);
        if (res.success) {
          setApplicationData(res.data.application);
          setDocuments(res.data.documents || []);
          if (res.data.inspection) {
            setExistingInspection(res.data.inspection);
            setInstrumentCondition(res.data.inspection.instrumentCondition);
            setSerialNumberVerified(res.data.inspection.serialNumberVerified);
            setSealCondition(res.data.inspection.sealCondition);
            setStandardWeight(res.data.inspection.standardWeight);
            setObservedReading(res.data.inspection.observedReading);
            setPermissibleError(res.data.inspection.permissibleError);
            setRemarks(res.data.inspection.remarks || '');
          }
          if (res.data.certificate) {
            setIssuedCertificate(res.data.certificate);
          }
        }
      } catch (err) {
        setError(err.message || 'Error loading application');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

  // LIVE INTERACTIVE ERROR CALCULATION
  const std = parseFloat(standardWeight) || 0;
  const obs = parseFloat(observedReading) || 0;
  const mpe = parseFloat(permissibleError) || 0;

  const calculatedError = parseFloat((obs - std).toFixed(6));
  const absoluteError = Math.abs(calculatedError);
  const isPass = absoluteError <= Math.abs(mpe);

  const handleRecordInspection = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/inspections', {
        applicationId: id,
        instrumentCondition,
        serialNumberVerified,
        sealCondition,
        standardWeight: std,
        observedReading: obs,
        permissibleError: mpe,
        remarks,
      });

      if (res.success) {
        setExistingInspection(res.data.inspection);
        if (res.data.inspection.result === 'FAIL') {
          setError('Inspection test recorded as FAIL: Measurement error or physical condition violated legal metrology limits. Application and instrument marked as REJECTED.');
        } else {
          setSuccess('Inspection observations recorded successfully! Result: PASS.');
        }
        try {
          const appRes = await api.get(`/officer/applications/${id}`);
          if (appRes.success) {
            setApplicationData(appRes.data.application);
          }
        } catch (e) {}
      }
    } catch (err) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndGenerateCertificate = async () => {
    setGeneratingCert(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/officer/applications/${id}/approve`);
      if (res.success) {
        setIssuedCertificate(res.data.certificate);
        setSuccess(`Certificate ${res.data.certificate.certificateNumber} generated successfully with embedded QR code & PDF!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate certificate');
    } finally {
      setGeneratingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
        <div className="mt-2 text-muted small">Loading inspection form...</div>
      </div>
    );
  }

  const inst = applicationData?.instrument;
  const biz = applicationData?.business;

  return (
    <div className="inspection-form">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold text-navy mb-0">Conduct Calibration & Inspection</h3>
            <StatusBadge status={applicationData?.status} />
          </div>
          <p className="text-muted small mb-0">
            Application: <strong className="font-monospace text-primary">{applicationData?.applicationNumber}</strong> • {biz?.businessName}
          </p>
        </div>

        <Link to="/officer/applications" className="btn btn-outline-secondary btn-sm mt-2 mt-sm-0">
          <i className="bi bi-arrow-left me-1"></i> Back to Queue
        </Link>
      </div>

      {success && <div className="alert alert-success py-2 px-3 small mb-4">{success}</div>}
      {error && <div className="alert alert-danger py-2 px-3 small mb-4">{error}</div>}

      {/* Verification Certificate Banner (if already generated) */}
      {issuedCertificate && (
        <div className="gov-card p-4 mb-4 bg-success-subtle border-success">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <span className="badge bg-success mb-1">
                <i className="bi bi-patch-check-fill me-1"></i> Certificate Stamped & Valid
              </span>
              <h5 className="fw-bold text-navy mb-1 font-monospace">
                Certificate Number: {issuedCertificate.certificateNumber}
              </h5>
              <small className="text-muted">
                Issued by you • Valid until {new Date(issuedCertificate.validUntil).toLocaleDateString()}
              </small>
            </div>
            <div className="d-flex gap-2 mt-2 mt-sm-0">
              <Link to={`/verify/${issuedCertificate.certificateNumber}`} className="btn btn-outline-dark btn-sm">
                <i className="bi bi-qr-code-scan me-1"></i> Public Verification
              </Link>
              <a
                href={getFileDownloadUrl(`/api/certificates/${issuedCertificate._id}/download`)}
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

      {/* Rejection Alert Banner */}
      {(applicationData?.status === 'REJECTED' || existingInspection?.result === 'FAIL') && (
        <div className="gov-card p-4 mb-4 bg-danger-subtle border-danger text-danger">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div>
              <span className="badge bg-danger mb-2">
                <i className="bi bi-x-octagon-fill me-1"></i> VERIFICATION REJECTED
              </span>
              <h5 className="fw-bold mb-1">
                Application Marked as REJECTED
              </h5>
              <p className="small mb-0">
                <strong>Reason:</strong> {applicationData?.rejectionReason || existingInspection?.remarks || 'Instrument failed metrological inspection error tolerance criteria.'}
              </p>
            </div>
            <Link to="/officer/applications" className="btn btn-outline-danger btn-sm mt-2 mt-sm-0">
              <i className="bi bi-arrow-left me-1"></i> Return to Queue
            </Link>
          </div>
        </div>
      )}

      {/* Instrument Overview Banner */}
      <div className="gov-card p-4 mb-4 bg-light">
        <div className="row g-3 small">
          <div className="col-md-3">
            <span className="text-muted d-block">Instrument Model:</span>
            <strong>{inst?.model}</strong> ({inst?.instrumentType})
          </div>
          <div className="col-md-3">
            <span className="text-muted d-block">Manufacturer:</span>
            <strong>{inst?.manufacturer}</strong>
          </div>
          <div className="col-md-3">
            <span className="text-muted d-block">Stamped Serial Number:</span>
            <strong className="font-monospace text-primary">{inst?.serialNumber}</strong>
          </div>
          <div className="col-md-3">
            <span className="text-muted d-block">Rated Capacity:</span>
            <strong>{inst?.capacity} {inst?.unit}</strong>
          </div>
        </div>
      </div>

      {/* Attached Verification Documents */}
      {documents.length > 0 && (
        <div className="gov-card p-3 mb-4 bg-white border">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold text-navy mb-0">
              <i className="bi bi-folder2-open text-primary me-2"></i>
              Applicant Uploaded Documents ({documents.length})
            </h6>
            <span className="small text-muted">Original purchase invoices & model approvals submitted by applicant</span>
          </div>
          <div className="d-flex flex-wrap gap-2 pt-1">
            {documents.map((doc) => (
              <a
                key={doc._id}
                href={getFileDownloadUrl(doc.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2 py-1 px-3"
              >
                <i className="bi bi-file-earmark-pdf text-danger"></i>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                  {doc.documentType}
                </span>
                <span className="text-truncate" style={{ maxWidth: '280px' }}>
                  {doc.fileName || 'Attachment'}
                </span>
                {doc.verificationStatus === 'APPROVED' ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle small">
                    <i className="bi bi-check-circle-fill me-1"></i>APPROVED
                  </span>
                ) : (
                  <span className="badge bg-warning-subtle text-dark border border-warning-subtle small">
                    PENDING
                  </span>
                )}
                <i className="bi bi-box-arrow-up-right small text-muted"></i>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Inspection Parameters */}
        <div className="col-lg-6">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3 border-bottom pb-2">
              <i className="bi bi-clipboard2-check text-primary me-2"></i>
              Physical Condition & Verification
            </h5>

            <form onSubmit={handleRecordInspection}>
              <div className="mb-3">
                <label className="form-label">Instrument Physical Condition *</label>
                <select
                  className="form-select"
                  value={instrumentCondition}
                  onChange={(e) => setInstrumentCondition(e.target.value)}
                  required
                >
                  <option value="SATISFACTORY">SATISFACTORY (Clean, leveling intact, free from debris)</option>
                  <option value="UNSATISFACTORY">UNSATISFACTORY (Defective knife-edges, worn load-cell)</option>
                  <option value="DAMAGED">DAMAGED (Physically impaired)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Manufacturer Serial Number Plate Verified *</label>
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="serialCheck"
                    checked={serialNumberVerified}
                    onChange={(e) => setSerialNumberVerified(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="serialCheck">
                    Physical serial plate matches application ({inst?.serialNumber})
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Security Lead Seal Condition *</label>
                <select
                  className="form-select"
                  value={sealCondition}
                  onChange={(e) => setSealCondition(e.target.value)}
                  required
                >
                  <option value="INTACT">INTACT (Tamper-evident seal present & untouched)</option>
                  <option value="BROKEN">BROKEN (Requires re-stamping)</option>
                  <option value="TAMPERED">TAMPERED (Suspected fraud / altered calibration)</option>
                  <option value="NOT_APPLICABLE">NOT_APPLICABLE (Initial manufacturer assembly)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Officer Inspection Remarks</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes on repeatability, eccentricity, and zero-tracking tests..."
                ></textarea>
              </div>

              <button type="submit" className="btn btn-gov-primary w-100 py-2 fw-bold" disabled={submitting}>
                {submitting ? 'Saving Observation to MongoDB...' : 'Save Inspection Observations'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Permissible Error Calculation Engine */}
        <div className="col-lg-6">
          <div className="gov-card p-4 h-100 border-start border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold text-navy mb-0">
                <i className="bi bi-calculator-fill text-primary me-2"></i>
                Metrological Error Calculation
              </h5>
              <span className="badge bg-secondary font-monospace">OIML R-76</span>
            </div>

            <p className="small text-muted mb-3">
              Enter certified standard reference weights and observed scale response. Error is mathematically evaluated against maximum permissible error (MPE).
            </p>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Standard Reference Weight ({inst?.unit || 'kg'}) *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control fw-bold"
                  value={standardWeight}
                  onChange={(e) => setStandardWeight(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Observed Instrument Reading ({inst?.unit || 'kg'}) *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control fw-bold"
                  value={observedReading}
                  onChange={(e) => setObservedReading(e.target.value)}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Maximum Permissible Error (MPE &plusmn; {inst?.unit || 'kg'}) *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={permissibleError}
                  onChange={(e) => setPermissibleError(e.target.value)}
                  required
                />
                <small className="text-muted">Prescribed statutory tolerance according to instrument accuracy class.</small>
              </div>
            </div>

            {/* LIVE DYNAMIC RESULT BOX */}
            <div className="p-3 rounded border bg-light mb-4">
              <h6 className="fw-bold text-secondary mb-2 small text-uppercase">Live Error Computation:</h6>

              <div className="d-flex justify-content-between py-1 border-bottom small">
                <span>Formula:</span>
                <span className="font-monospace text-primary fw-bold">Error = Observed - Standard</span>
              </div>

              <div className="d-flex justify-content-between py-1 border-bottom small">
                <span>Calculated Error:</span>
                <span className="font-monospace fw-bold">
                  {calculatedError > 0 ? `+${calculatedError}` : calculatedError} {inst?.unit || 'kg'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-1 border-bottom small">
                <span>Absolute Error (|Error|):</span>
                <span className="font-monospace fw-bold">{absoluteError} {inst?.unit || 'kg'}</span>
              </div>

              <div className="d-flex justify-content-between py-1 border-bottom small">
                <span>Compliance Condition:</span>
                <span className="font-monospace small">
                  {absoluteError} &le; {mpe} {inst?.unit || 'kg'}
                </span>
              </div>

              {/* Big Visual PASS/FAIL Badge */}
              <div className="mt-3 text-center">
                {isPass ? (
                  <div className="p-3 bg-success text-white rounded shadow-sm">
                    <h4 className="fw-bold mb-0">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      PASS
                    </h4>
                    <small>Measurement error is within the permissible legal metrology tolerance.</small>
                  </div>
                ) : (
                  <div className="p-3 bg-danger text-white rounded shadow-sm">
                    <h4 className="fw-bold mb-0">
                      <i className="bi bi-x-circle-fill me-2"></i>
                      FAIL
                    </h4>
                    <small>Measurement error exceeds the maximum permissible limit. Instrument cannot be certified.</small>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Generation Action */}
            {existingInspection && existingInspection.result === 'PASS' && isPass && applicationData?.status !== 'REJECTED' && !issuedCertificate && (
              <div className="border-top pt-3">
                <button
                  type="button"
                  className="btn btn-success w-100 py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  onClick={handleApproveAndGenerateCertificate}
                  disabled={generatingCert}
                >
                  {generatingCert ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Generating PDFKit Certificate & QR Code...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-patch-check-fill fs-5"></i>
                      Approve Verification & Generate Certificate
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionForm;
