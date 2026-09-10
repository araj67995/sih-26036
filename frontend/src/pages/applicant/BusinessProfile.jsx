import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const BusinessProfile = () => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await api.get('/business');
        if (res.success) {
          setBusiness(res.data);
        }
      } catch (err) {
        setError('Failed to fetch business profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, []);

  const handleChange = (e) => {
    setBusiness({ ...business, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await api.put(`/business/${business._id}`, business);
      if (res.success) {
        setMessage('Business establishment profile updated successfully in MongoDB!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading business profile...</div>
      </div>
    );
  }

  return (
    <div className="business-profile">
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">Commercial Establishment Profile</h3>
        <p className="text-muted small mb-0">
          Official trade details and registered premises under Legal Metrology records
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="gov-card p-4 p-md-5">
            {message && <div className="alert alert-success py-2 px-3 small mb-4">{message}</div>}
            {error && <div className="alert alert-danger py-2 px-3 small mb-4">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Business / Trade Name *</label>
                <input
                  type="text"
                  name="businessName"
                  className="form-control"
                  value={business?.businessName || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Business Type *</label>
                  <select
                    name="businessType"
                    className="form-select"
                    value={business?.businessType || 'Retailer / Trader'}
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

                <div className="col-md-6">
                  <label className="form-label">GST Number (GSTIN)</label>
                  <input
                    type="text"
                    name="gstNumber"
                    className="form-control text-uppercase"
                    value={business?.gstNumber || ''}
                    onChange={handleChange}
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Establishment Address *</label>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  value={business?.address || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label">District *</label>
                  <input
                    type="text"
                    name="district"
                    className="form-control"
                    value={business?.district || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">State *</label>
                  <input
                    type="text"
                    name="state"
                    className="form-control"
                    value={business?.state || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    className="form-control"
                    value={business?.pincode || ''}
                    onChange={handleChange}
                    maxLength="6"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="text"
                    name="contactNumber"
                    className="form-control"
                    value={business?.contactNumber || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Communication Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={business?.email || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-gov-primary w-100 py-2 fw-bold" disabled={saving}>
                {saving ? 'Saving changes...' : 'Update Establishment Details'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;
