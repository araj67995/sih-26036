import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkSystemHealth } from '../services/api';

const Home = () => {
  const [certInput, setCertInput] = useState('');
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await checkSystemHealth();
        setHealthStatus(response.data);
      } catch (err) {
        setHealthStatus({
          status: 'OFFLINE',
          message: 'Backend server not reached',
          database: { connected: false, status: 'disconnected' },
        });
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealth();
  }, []);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const cleanCert = certInput.trim();
    if (cleanCert) {
      navigate(`/verify/${encodeURIComponent(cleanCert)}`);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container py-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="badge bg-light text-primary fw-semibold px-3 py-2 mb-3">
                <i className="bi bi-award-fill me-1"></i> Legal Metrology Verification System
              </span>
              <h1 className="hero-title mb-3">
                Digital Verification of Weighing & Measuring Instruments
              </h1>
              <p className="hero-subtitle mb-4">
                A unified, transparent portal under Legal Metrology. Simplifying instrument registration, digital inspection scheduling, automated error compliance verification, and instant public validation.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-warning btn-lg fw-bold px-4 text-dark shadow-sm">
                  <i className="bi bi-person-plus-fill me-2"></i> Register Instrument
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4">
                  <i className="bi bi-box-arrow-in-right me-2"></i> Officer / Admin Login
                </Link>
              </div>
            </div>

            {/* Quick Public Verification Box */}
            <div className="col-lg-5">
              <div className="verify-search-box">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary text-white rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-qr-code-scan fs-5"></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold text-navy">Quick Certificate Verification</h5>
                    <small className="text-muted">Public Access • No Login Required</small>
                  </div>
                </div>
                <p className="small text-secondary mb-3">
                  Verify the authenticity, validity, and inspection history of any commercial weighing or measuring instrument across the nation.
                </p>
                <form onSubmit={handleVerifySubmit}>
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="e.g. LM-BR-2026-000001"
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      aria-label="Certificate Number"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-gov-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2">
                    <i className="bi bi-patch-check-fill"></i>
                    Verify Certificate Authenticity
                  </button>
                </form>
                <div className="mt-3 pt-3 border-top text-center">
                  <small className="text-muted">
                    <i className="bi bi-camera me-1"></i> Scan QR code printed on the physical calibration sticker to verify directly.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Backend Health Check Pill & System Status */}
      <section className="bg-white border-bottom py-2">
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-center py-1">
            <div className="d-flex align-items-center gap-2 small">
              <span className="fw-semibold text-secondary">Backend API Health:</span>
              {healthLoading ? (
                <span className="badge bg-secondary">Checking...</span>
              ) : healthStatus?.status === 'UP' ? (
                <span className="badge bg-success d-inline-flex align-items-center gap-1">
                  <i className="bi bi-check-circle-fill"></i> Operational (Port 5000)
                </span>
              ) : (
                <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                  <i className="bi bi-exclamation-triangle-fill"></i> Offline
                </span>
              )}

              <span className="text-muted ms-2 d-none d-md-inline">|</span>
              <span className="fw-semibold text-secondary d-none d-md-inline ms-2">Database:</span>
              {healthLoading ? (
                <span className="badge bg-secondary d-none d-md-inline">Checking...</span>
              ) : healthStatus?.database?.connected ? (
                <span className="badge bg-success d-none d-md-inline">Connected (MongoDB)</span>
              ) : (
                <span className="badge bg-warning text-dark d-none d-md-inline">
                  {healthStatus?.database?.status || 'Standby'}
                </span>
              )}
            </div>

            <div className="text-secondary small font-monospace">
              <i className="bi bi-cpu me-1"></i> SIH Problem ID: 26036 • Legal Metrology
            </div>
          </div>
        </div>
      </section>

      {/* Portal Roles Section */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-dark mb-2">Dedicated Stakeholder Portals</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: '650px' }}>
              Tailored workspaces for businesses, inspecting officers, and administrative authorities to streamline certification workflows.
            </p>
          </div>

          <div className="row g-4">
            {/* Applicant Card */}
            <div className="col-md-4">
              <div className="gov-card role-card p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-primary bg-opacity-10 text-primary rounded p-3 fs-3">
                    <i className="bi bi-shop-window"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Applicant / Business</h5>
                    <span className="badge bg-light text-primary border">Trader & Manufacturer</span>
                  </div>
                </div>
                <p className="text-secondary small mb-4">
                  Register businesses and weighing instruments, submit initial and renewal applications, upload test documentation, and download QR-stamped certificates.
                </p>
                <ul className="list-unstyled small text-secondary mb-4 d-flex flex-column gap-2">
                  <li><i className="bi bi-check2 text-success me-2"></i>Register Weighing & Measuring Instruments</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>Track Multi-Stage Verification Status</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>Download PDF Calibration Certificates</li>
                </ul>
                <Link to="/login?role=applicant" className="btn btn-outline-primary w-100 mt-auto fw-semibold">
                  Applicant Sign In <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>
            </div>

            {/* Officer Card */}
            <div className="col-md-4">
              <div className="gov-card role-card p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-info bg-opacity-10 text-primary rounded p-3 fs-3">
                    <i className="bi bi-clipboard2-check-fill"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Inspector Officer</h5>
                    <span className="badge bg-light text-info border text-dark">Legal Metrology Officer</span>
                  </div>
                </div>
                <p className="text-secondary small mb-4">
                  Review assigned verification applications, conduct field inspections, record standard weights vs observed readings, and automate error compliance checks.
                </p>
                <ul className="list-unstyled small text-secondary mb-4 d-flex flex-column gap-2">
                  <li><i className="bi bi-check2 text-success me-2"></i>Automated Permissible Error Calculation</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>Pass/Fail Decision & Stamp Verification</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>Generate Digital Verification Certificate</li>
                </ul>
                <Link to="/login?role=officer" className="btn btn-outline-primary w-100 mt-auto fw-semibold">
                  Officer Sign In <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>
            </div>

            {/* Admin Card */}
            <div className="col-md-4">
              <div className="gov-card role-card p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-dark bg-opacity-10 text-dark rounded p-3 fs-3">
                    <i className="bi bi-shield-shaded"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Administrator</h5>
                    <span className="badge bg-light text-dark border">State / District Admin</span>
                  </div>
                </div>
                <p className="text-secondary small mb-4">
                  Complete governance dashboard. Manage user roles, assign verification loads to officers, monitor district compliance statistics, and inspect immutable audit logs.
                </p>
                <ul className="list-unstyled small text-secondary mb-4 d-flex flex-column gap-2">
                  <li><i className="bi bi-check2 text-success me-2"></i>Officer Application Workload Balancing</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>Comprehensive Audit Trail & Logs</li>
                  <li><i className="bi bi-check2 text-success me-2"></i>District Verification Reports & Analytics</li>
                </ul>
                <Link to="/login?role=admin" className="btn btn-outline-dark w-100 mt-auto fw-semibold">
                  Admin Sign In <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* End-to-End Verification Process Flow */}
      <section id="workflow" className="py-5 bg-light border-top border-bottom">
        <div className="container">
          <div className="text-center mb-5">
            <span className="badge bg-primary px-3 py-1 mb-2">Standard Operating Procedure</span>
            <h2 className="fw-bold text-dark">Digitized Verification Life Cycle</h2>
            <p className="text-muted">
              Six synchronized stages ensuring metrological traceability, consumer protection, and tamper resistance.
            </p>
          </div>

          <div className="row g-4 text-center">
            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">1</div>
                <h6 className="fw-bold mb-1">Registration</h6>
                <p className="small text-muted mb-0">Business & instrument details registered with serial number.</p>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">2</div>
                <h6 className="fw-bold mb-1">Document Check</h6>
                <p className="small text-muted mb-0">Officer verifies purchase invoice, model approval, and calibration slip.</p>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">3</div>
                <h6 className="fw-bold mb-1">Inspection</h6>
                <p className="small text-muted mb-0">Physical inspection scheduled at test centre or applicant premises.</p>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">4</div>
                <h6 className="fw-bold mb-1">Error Math</h6>
                <p className="small text-muted mb-0">Standard vs observed error calculated against permissible limit.</p>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">5</div>
                <h6 className="fw-bold mb-1">Pass / Fail</h6>
                <p className="small text-muted mb-0">Instrument stamped and approved by authorized officer.</p>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="gov-card p-3 h-100">
                <div className="step-circle">6</div>
                <h6 className="fw-bold mb-1">QR Certificate</h6>
                <p className="small text-muted mb-0">Tamper-evident digital PDF certificate issued with public QR.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Standards and Features */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6">
              <span className="badge bg-secondary mb-2">Legal Compliance</span>
              <h3 className="fw-bold mb-3">Conforming with Legal Metrology Standards</h3>
              <p className="text-secondary mb-4">
                The Legal Metrology (General) Rules, 2011 mandate mandatory initial verification and periodical reverification of all commercial weighing instruments to ensure fair trade and consumer accuracy.
              </p>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="p-3 border rounded bg-white">
                    <i className="bi bi-calculator text-primary fs-4 mb-2 d-block"></i>
                    <h6 className="fw-bold mb-1">Automated Limits</h6>
                    <small className="text-muted">Computes maximum permissible error (MPE) based on accuracy class (I, II, III, IIII).</small>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-3 border rounded bg-white">
                    <i className="bi bi-clock-history text-primary fs-4 mb-2 d-block"></i>
                    <h6 className="fw-bold mb-1">Audit Trail</h6>
                    <small className="text-muted">Immutable log of timestamps, officer remarks, and document changes.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="gov-card p-4 border-start border-4 border-primary">
                <h5 className="fw-bold mb-3">Formula for Automated Error Verification</h5>
                <div className="bg-light p-3 rounded font-monospace small mb-3">
                  <div>// Legal Metrology Error Computation</div>
                  <div className="text-primary fw-bold">Error = Observed Reading - Standard Reference Weight</div>
                  <div className="mt-1">Absolute Error = |Error|</div>
                  <div className="mt-1 text-success fw-bold">If Absolute Error &le; Permissible Error &rarr; PASS</div>
                  <div className="text-danger fw-bold">If Absolute Error &gt; Permissible Error &rarr; FAIL</div>
                </div>
                <p className="small text-muted mb-0">
                  <i className="bi bi-info-circle me-1"></i> Officers input the certified standard weight and the observed instrument response. The system mathematically verifies compliance before allowing certificate generation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
