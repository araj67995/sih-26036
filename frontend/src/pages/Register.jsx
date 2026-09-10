import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: 'Retailer / Trader',
    state: 'Delhi',
    district: 'Central Delhi',
    pincode: '110001',
    agreeTerms: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Please accept the statutory Legal Metrology declaration');
      return;
    }

    setLoading(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      businessName: formData.businessName,
      businessType: formData.businessType,
      state: formData.state,
      district: formData.district,
      pincode: formData.pincode,
    });
    setLoading(false);

    if (result.success) {
      navigate('/applicant/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="gov-card p-4 p-md-5">
              <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
                <div className="bg-primary text-white rounded p-3 fs-3">
                  <i className="bi bi-person-badge-fill"></i>
                </div>
                <div>
                  <h3 className="fw-bold text-navy mb-1">Applicant & Business Registration</h3>
                  <p className="text-muted small mb-0">
                    Create an official portal account to register instruments and apply for calibration verification
                  </p>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <h5 className="fw-bold text-secondary mb-3 border-bottom pb-2">
                  1. Applicant Information
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      Full Name of Authorized Person <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Email Address (Login ID) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="applicant@business.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Mobile Number <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">+91</span>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <h5 className="fw-bold text-secondary mb-3 border-bottom pb-2">
                  2. Business & Establishment Profile
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">
                      Business / Trade Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      className="form-control"
                      placeholder="e.g. Acme Weighing Solutions Ltd."
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Business Type / Industry <span className="text-danger">*</span>
                    </label>
                    <select
                      name="businessType"
                      className="form-select"
                      value={formData.businessType}
                      onChange={handleChange}
                    >
                      <option value="Retailer / Trader">Retailer / Trader</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Authorized Dealer">Authorized Dealer</option>
                      <option value="Repairer / Service Center">Repairer / Service Center</option>
                      <option value="Importer">Importer</option>
                      <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      name="state"
                      className="form-control"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      District <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="district"
                      className="form-control"
                      placeholder="e.g. Central Delhi"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Postal Pincode <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      className="form-control"
                      placeholder="110001"
                      value={formData.pincode}
                      onChange={handleChange}
                      maxLength="6"
                      required
                    />
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    name="agreeTerms"
                    className="form-check-input"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="agreeTerms" className="form-check-label small text-secondary">
                    I declare that the information submitted above is accurate and complies with the Legal Metrology (Enforcement) Rules.
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-gov-primary w-100 py-2 fw-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting to MongoDB...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Complete Applicant Registration
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted small mb-0">
                  Already have an applicant account?{' '}
                  <Link to="/login?role=applicant" className="text-primary fw-semibold text-decoration-none">
                    Sign In Here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
