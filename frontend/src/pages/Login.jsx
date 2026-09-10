import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'applicant';

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    email:
      initialRole === 'officer'
        ? 'officer1@metrology.gov.in'
        : initialRole === 'admin'
        ? 'admin@metrology.gov.in'
        : 'applicant@demo.com',
    password:
      initialRole === 'officer'
        ? 'Officer@123'
        : initialRole === 'admin'
        ? 'Admin@123'
        : 'Password@123',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    // Auto-fill demo credentials for convenience
    if (role === 'applicant') {
      setFormData({ email: 'applicant@demo.com', password: 'Password@123' });
    } else if (role === 'officer') {
      setFormData({ email: 'officer1@metrology.gov.in', password: 'Officer@123' });
    } else if (role === 'admin') {
      setFormData({ email: 'admin@metrology.gov.in', password: 'Admin@123' });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please provide email address and password');
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password, selectedRole);
    setLoading(false);

    if (result.success) {
      // Redirect based on role
      const userRole = result.user.role;
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'officer') {
        navigate('/officer/dashboard');
      } else {
        navigate('/applicant/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'officer':
        return 'Legal Metrology Officer (Inspector)';
      case 'admin':
        return 'Central / State Administrator';
      default:
        return 'Applicant / Commercial Business';
    }
  };

  return (
    <div className="py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="gov-card p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="gov-emblem mb-2">⚖️</div>
                <h3 className="fw-bold text-navy mb-1">National Metrology Portal</h3>
                <p className="text-muted small">Sign in to your authorized departmental or applicant workspace</p>
              </div>

              {/* Role Switcher Tabs */}
              <div className="btn-group w-100 mb-4" role="group" aria-label="Role selection">
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'applicant' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleRoleChange('applicant')}
                >
                  <i className="bi bi-shop me-1"></i> Applicant
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'officer' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleRoleChange('officer')}
                >
                  <i className="bi bi-shield-check me-1"></i> Officer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'admin' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => handleRoleChange('admin')}
                >
                  <i className="bi bi-gear-fill me-1"></i> Admin
                </button>
              </div>

              <div className="alert alert-light border py-2 px-3 mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-person-badge text-primary fs-5"></i>
                <div className="small">
                  Logging in as: <strong className="text-primary">{getRoleTitle()}</strong>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-envelope text-muted"></i>
                    </span>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label mb-0">
                      Password <span className="text-danger">*</span>
                    </label>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-lock text-muted"></i>
                    </span>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-gov-primary w-100 py-2 fw-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Authenticating with MongoDB...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Sign In to Portal
                    </>
                  )}
                </button>
              </form>

              {selectedRole === 'applicant' && (
                <div className="text-center mt-4 pt-3 border-top">
                  <p className="text-muted small mb-0">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary fw-semibold text-decoration-none">
                      Register Your Business
                    </Link>
                  </p>
                </div>
              )}

              {/* Demo Credentials Quick Switcher */}
              <div className="bg-light rounded p-3 mt-4 border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-bold text-secondary">
                    <i className="bi bi-key me-1"></i> Pre-loaded Demo Account
                  </span>
                  <span className="badge bg-success">Ready in DB</span>
                </div>
                <div className="small text-muted font-monospace">
                  {selectedRole === 'applicant' && 'applicant@demo.com / Password@123'}
                  {selectedRole === 'officer' && 'officer1@metrology.gov.in / Officer@123'}
                  {selectedRole === 'admin' && 'admin@metrology.gov.in / Admin@123'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
