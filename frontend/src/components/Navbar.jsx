import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const location = useLocation();

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  return (
    <header className="sticky-top">
      {/* Indian National Tricolor Accent Bar */}
      <div className="gov-top-stripe"></div>

      {/* Top Utility Header Bar */}
      <div className="gov-header-bar">
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <span>
              <i className="bi bi-shield-check text-warning me-1"></i>
              Legal Metrology Division • Department of Consumer Affairs
            </span>
            <span className="d-none d-md-inline text-muted">|</span>
            <span className="d-none d-md-inline text-light">
              Standardization & Weights and Measures Act
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-warning text-dark font-monospace px-2 py-1">
              SIH 26036 PROTOTYPE
            </span>
            <span className="d-none d-sm-inline">
              <i className="bi bi-telephone me-1"></i> 1800-11-4000
            </span>
          </div>
        </div>
      </div>

      {/* Main Bootstrap Navbar */}
      <nav className="navbar navbar-expand-lg gov-navbar navbar-dark">
        <div className="container">
          <Link to="/" className="gov-brand">
            <div className="gov-emblem">⚖️</div>
            <div>
              <h1 className="gov-brand-title">Metro Verify</h1>
              <p className="gov-brand-sub">Verification of Weighing & Measuring Instruments</p>
            </div>
          </Link>

          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#govNav"
            aria-controls="govNav"
            aria-expanded={!isNavCollapsed}
            aria-label="Toggle navigation"
            onClick={handleNavCollapse}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`${isNavCollapsed ? 'collapse' : ''} navbar-collapse`} id="govNav">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
              <li className="nav-item">
                <Link
                  to="/"
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-house-door me-1"></i> Home
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/verify"
                  className={`nav-link ${location.pathname.startsWith('/verify') ? 'active' : ''}`}
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-patch-check me-1"></i> Verify Certificate
                </Link>
              </li>
              <li className="nav-item">
                <a
                  href="#workflow"
                  className="nav-link"
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-diagram-3 me-1"></i> Process Flow
                </a>
              </li>
              <li className="nav-item ms-lg-3 mt-2 mt-lg-0">
                <Link
                  to="/login"
                  className="btn btn-outline-light btn-sm px-3 me-2"
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i> Portal Login
                </Link>
              </li>
              <li className="nav-item mt-2 mt-lg-0">
                <Link
                  to="/register"
                  className="btn btn-warning btn-sm px-3 fw-bold text-dark"
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-person-plus-fill me-1"></i> Register Business
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Sub-Banner for Official Prototype Disclaimer */}
      <div className="prototype-badge-banner">
        <div className="container text-center">
          <small>
            <i className="bi bi-info-circle-fill me-1"></i>
            <strong>Notice:</strong> This web application is a functional prototype developed for{' '}
            <strong>Smart India Hackathon (Problem ID: 26036)</strong>. It simulates the official digitization workflow of weighing and measuring verification.
          </small>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
