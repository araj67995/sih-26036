import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminTestCentres = () => {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    district: 'Central Delhi',
    state: 'Delhi',
    contact: '',
  });
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCentres = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/test-centres');
      if (res.success) {
        setCentres(res.data);
      }
    } catch (err) {
      console.error('Error loading test centres:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateCentre = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await api.post('/admin/test-centres', formData);
      if (res.success) {
        setShowModal(false);
        setAlert({ type: 'success', message: 'Test Centre added successfully to MongoDB!' });
        setFormData({
          name: '',
          address: '',
          district: 'Central Delhi',
          state: 'Delhi',
          contact: '',
        });
        fetchCentres();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Error adding test centre' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-test-centres">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">Accredited Calibration Test Centres</h3>
          <p className="text-muted small mb-0">
            Authorized state calibration laboratories and secondary standards testing stations
          </p>
        </div>
        <button className="btn btn-gov-primary btn-sm mt-2 mt-sm-0" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-1"></i> Add Test Centre
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show py-2 px-3 small mb-3`} role="alert">
          {alert.message}
          <button type="button" className="btn-close py-2" onClick={() => setAlert(null)}></button>
        </div>
      )}

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="ms-2 text-muted small">Loading test centres from MongoDB...</span>
          </div>
        ) : centres.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-geo-alt display-5 d-block mb-2"></i>
            No test centres registered yet.
          </div>
        ) : (
          <div className="row g-4">
            {centres.map((c) => (
              <div key={c._id} className="col-md-6 col-lg-4">
                <div className="p-3 border rounded h-100 bg-light">
                  <h6 className="fw-bold text-navy mb-2">
                    <i className="bi bi-building-check text-primary me-2"></i>
                    {c.name}
                  </h6>
                  <p className="small text-secondary mb-2">{c.address}</p>
                  <div className="small text-muted mb-1">
                    <i className="bi bi-geo-fill text-danger me-1"></i>
                    {c.district}, {c.state}
                  </div>
                  <div className="small text-muted">
                    <i className="bi bi-telephone-fill text-success me-1"></i>
                    {c.contact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">Add Calibration Test Centre</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleCreateCentre}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Centre Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. West Delhi Secondary Calibration Station"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Physical Address *</label>
                    <input
                      type="text"
                      name="address"
                      className="form-control"
                      placeholder="e.g. Ring Road Complex"
                      value={formData.address}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">District *</label>
                      <input
                        type="text"
                        name="district"
                        className="form-control"
                        value={formData.district}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">State *</label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Contact Phone *</label>
                    <input
                      type="text"
                      name="contact"
                      className="form-control"
                      placeholder="011-23456789"
                      value={formData.contact}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gov-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Save Test Centre'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTestCentres;
