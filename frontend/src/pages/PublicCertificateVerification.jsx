import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getFileDownloadUrl } from '../services/api';

const PublicCertificateVerification = () => {
  const { certificateNumber } = useParams();
  const [query, setQuery] = useState(certificateNumber || '');
  const [certificateData, setCertificateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const performVerification = async (certNo) => {
    if (!certNo) return;
    setLoading(true);
    setNotFound(false);
    setErrorMsg('');
    setSearched(true);
    setCertificateData(null);

    try {
      const res = await api.get(`/verify/${encodeURIComponent(certNo.trim())}`);
      if (res.success && res.data) {
        setCertificateData(res.data);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err.statusCode === 404) {
        setNotFound(true);
      } else {
        setErrorMsg(err.message || 'Error communicating with verification registry');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certificateNumber) {
      setQuery(certificateNumber);
      performVerification(certificateNumber);
    }
  }, [certificateNumber]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performVerification(query.trim());
    }
  };

  return (
    <div className="py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="gov-card p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="gov-emblem mb-2">⚖️</div>
                <h3 className="fw-bold text-navy mb-1">Public Certificate Verification</h3>
                <p className="text-muted small">
                  Statutory verification and calibration status of commercial weighing and measuring instruments
                </p>
                <span className="badge bg-light text-secondary border">Public Access • No Login Required</span>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-4">
                <label className="form-label">Certificate Reference Number or QR Code Identifier</label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control font-monospace text-uppercase"
                    placeholder="e.g. LM-DL-2026-000001"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-gov-primary px-4 fw-bold" disabled={loading}>
                    {loading ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      'Verify Authenticity'
                    )}
                  </button>
                </div>
                <small className="text-muted mt-1 d-block">
                  <i className="bi bi-info-circle me-1"></i>
                  Sample verified numbers in system: <strong>LM-DL-2026-000001</strong>, <strong>LM-DL-2026-000002</strong>, <strong>LM-DL-2026-000003</strong>
                </small>
              </form>

              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="mt-2 text-muted small">Checking National Legal Metrology Registry...</div>
                </div>
              )}

              {/* ✕ CERTIFICATE NOT FOUND */}
              {searched && notFound && !loading && (
                <div className="p-4 border rounded border-danger bg-danger-subtle text-center mb-3">
                  <div className="display-6 text-danger mb-2">
                    <i className="bi bi-x-octagon-fill"></i>
                  </div>
                  <h4 className="fw-bold text-danger mb-1">&#10005; CERTIFICATE NOT FOUND</h4>
                  <p className="text-danger small mb-0">
                    No active or archived Legal Metrology calibration record exists for certificate identifier{' '}
                    <strong>"{query}"</strong>. This instrument may not be legally verified or stamped.
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="alert alert-warning py-2 px-3 small mb-3">{errorMsg}</div>
              )}

              {/* RESULT DISPLAY */}
              {certificateData && !loading && (
                <div className="border rounded p-4 bg-white shadow-sm">
                  {/* Status Headline */}
                  <div className="text-center mb-4 pb-3 border-bottom">
                    {certificateData.status === 'VALID' && (
                      <div className="p-3 bg-success text-white rounded">
                        <h4 className="fw-bold mb-0">
                          <i className="bi bi-check-circle-fill me-2"></i>
                          &#10003; VALID CERTIFICATE
                        </h4>
                        <small>This weighing/measuring instrument is legally verified, calibrated, and stamped.</small>
                      </div>
                    )}

                    {certificateData.status === 'EXPIRED' && (
                      <div className="p-3 bg-warning text-dark rounded">
                        <h4 className="fw-bold mb-0">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          &#9888; CERTIFICATE EXPIRED
                        </h4>
                        <small>The verification validity for this instrument has lapsed. Immediate re-verification required.</small>
                      </div>
                    )}

                    {certificateData.status === 'CANCELLED' && (
                      <div className="p-3 bg-danger text-white rounded">
                        <h4 className="fw-bold mb-0">
                          <i className="bi bi-x-circle-fill me-2"></i>
                          &#10005; CERTIFICATE CANCELLED
                        </h4>
                        <small>This certificate was revoked/cancelled by the Legal Metrology Department.</small>
                      </div>
                    )}
                  </div>

                  {/* Public Data Attributes */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Certificate Number:</span>
                        <strong className="font-monospace text-navy fs-6">{certificateData.certificateNumber}</strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Commercial Establishment:</span>
                        <strong className="text-navy">{certificateData.businessName}</strong>
                        <small className="text-muted d-block">{certificateData.businessDistrict}, {certificateData.businessState}</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Instrument Type:</span>
                        <strong className="text-navy">{certificateData.instrument?.instrumentType}</strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Manufacturer & Model:</span>
                        <strong className="text-navy">
                          {certificateData.instrument?.manufacturer} / {certificateData.instrument?.model}
                        </strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Stamped Serial Number:</span>
                        <strong className="font-monospace text-primary">{certificateData.instrument?.serialNumber}</strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Rated Capacity:</span>
                        <strong className="text-navy">
                          {certificateData.instrument?.capacity} {certificateData.instrument?.unit}
                        </strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Date of Verification:</span>
                        <strong className="text-dark">
                          {new Date(certificateData.issueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-2 border rounded bg-light">
                        <span className="text-muted d-block small">Valid Until:</span>
                        <strong className={certificateData.isValid ? 'text-success' : 'text-danger'}>
                          {new Date(certificateData.validUntil).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="p-2 border rounded bg-light d-flex justify-content-between align-items-center">
                        <div>
                          <span className="text-muted d-block small">Verified By:</span>
                          <strong className="text-navy">
                            <i className="bi bi-shield-check text-success me-1"></i>
                            {certificateData.verifiedBy || 'Authorized Legal Metrology Inspector'}
                          </strong>
                        </div>
                        {certificateData.pdfDownloadUrl && (
                          <a
                            href={getFileDownloadUrl(certificateData.pdfDownloadUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-success btn-sm"
                          >
                            <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download Stamped PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-4 pt-3 border-top">
                    <small className="text-muted">
                      <i className="bi bi-shield-lock-fill text-primary me-1"></i>
                      Cryptographic Verification Token: <code className="text-dark">{certificateData.verificationToken}</code>
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCertificateVerification;
