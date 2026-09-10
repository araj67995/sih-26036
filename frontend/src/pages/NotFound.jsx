import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="py-5 text-center my-auto">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="gov-card p-5">
              <div className="display-1 text-primary fw-bold mb-3">404</div>
              <h3 className="fw-bold text-navy mb-2">Page Not Found</h3>
              <p className="text-secondary mb-4">
                The requested URL or departmental resource could not be located on the Legal Metrology Verification portal.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/" className="btn btn-gov-primary px-4">
                  <i className="bi bi-house-door-fill me-2"></i> Return to Home
                </Link>
                <Link to="/verify" className="btn btn-outline-secondary px-4">
                  <i className="bi bi-patch-check me-2"></i> Verify Certificate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
