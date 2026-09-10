import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="gov-footer mt-auto">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <h6>About Legal Metrology Verification</h6>
            <p className="text-secondary small mb-3">
              The centralized online portal provides end-to-end digitization for the verification, inspection, and certification of weighing and measuring instruments in accordance with the Legal Metrology Act, 2009.
            </p>
            <div className="d-flex align-items-center gap-2 text-warning small">
              <i className="bi bi-shield-lock-fill"></i>
              <span>Tamper-Proof QR Digitally Signed Certificates</span>
            </div>
          </div>

          <div className="col-lg-2 col-md-6">
            <h6>Portals</h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link to="/login?role=applicant">Applicant / Trader Portal</Link>
              </li>
              <li>
                <Link to="/login?role=officer">Inspector Officer Portal</Link>
              </li>
              <li>
                <Link to="/login?role=admin">Administrator Console</Link>
              </li>
              <li>
                <Link to="/register">Register New Business</Link>
              </li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6>Public Services</h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link to="/verify">Public Certificate Verification</Link>
              </li>
              <li>
                <a href="#rules">Permissible Error Standards (OIML R-76)</a>
              </li>
              <li>
                <a href="#help">Authorized Test Centers</a>
              </li>
              <li>
                <a href="#fees">Fee Structure & Renewal Guidelines</a>
              </li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6>Helpdesk & Support</h6>
            <div className="small text-secondary mb-2">
              <i className="bi bi-telephone-fill text-primary me-2"></i>
              National Consumer Helpline: 1800-11-4000
            </div>
            <div className="small text-secondary mb-2">
              <i className="bi bi-envelope-fill text-primary me-2"></i>
              metrology-support@gov.in (Demo)
            </div>
            <div className="small text-secondary mb-3">
              <i className="bi bi-clock-fill text-primary me-2"></i>
              Working Hours: Mon - Fri, 9:30 AM - 6:00 PM
            </div>
            <span className="badge bg-secondary text-light">System Phase: 1.0 (Baseline)</span>
          </div>
        </div>

        <div className="gov-footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <div>
            © {new Date().getFullYear()} Legal Metrology Division. Built for Smart India Hackathon (Problem ID: 26036).
          </div>
          <div className="text-secondary small">
            Prototype / Demonstration Implementation • Not for production legal enforcement
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
