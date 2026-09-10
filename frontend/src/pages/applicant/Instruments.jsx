import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const Instruments = () => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    instrumentType: 'Electronic Counter Scale',
    manufacturer: '',
    model: '',
    serialNumber: '',
    capacity: '',
    unit: 'kg',
    location: 'Main Store Counter',
  });

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/instruments');
      if (res.success) {
        setInstruments(res.data);
      }
    } catch (err) {
      setError('Failed to fetch instruments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateInstrument = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/instruments', {
        ...formData,
        capacity: Number(formData.capacity),
      });

      if (res.success) {
        setSuccess('Instrument registered successfully in MongoDB!');
        setShowModal(false);
        setFormData({
          instrumentType: 'Electronic Counter Scale',
          manufacturer: '',
          model: '',
          serialNumber: '',
          capacity: '',
          unit: 'kg',
          location: 'Main Store Counter',
        });
        fetchInstruments();
      }
    } catch (err) {
      setError(err.message || 'Failed to register instrument');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="applicant-instruments">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">Registered Weighing & Measuring Instruments</h3>
          <p className="text-muted small mb-0">
            Official repository of commercial instruments registered for periodic Legal Metrology verification
          </p>
        </div>
        <button className="btn btn-gov-primary btn-sm mt-2 mt-sm-0" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-1"></i> Register New Instrument
        </button>
      </div>

      {success && <div className="alert alert-success py-2 px-3 small mb-3">{success}</div>}
      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span className="ms-2 text-muted small">Loading instruments...</span>
          </div>
        ) : instruments.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-speedometer display-6 d-block mb-2"></i>
            No instruments registered yet.
            <div className="mt-3">
              <button className="btn btn-gov-primary btn-sm" onClick={() => setShowModal(true)}>
                Register Your First Instrument
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Serial Number</th>
                  <th>Capacity</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((inst) => (
                  <tr key={inst._id}>
                    <td className="fw-semibold text-navy">{inst.instrumentType}</td>
                    <td>{inst.manufacturer}</td>
                    <td>{inst.model}</td>
                    <td className="font-monospace text-primary fw-bold">{inst.serialNumber}</td>
                    <td>
                      {inst.capacity} {inst.unit}
                    </td>
                    <td className="small text-muted">{inst.location}</td>
                    <td>
                      <StatusBadge status={inst.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Instrument Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-speedometer2 text-primary me-2"></i>
                  Register Commercial Instrument
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleCreateInstrument}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Instrument Category / Type *</label>
                    <select
                      name="instrumentType"
                      className="form-select"
                      value={formData.instrumentType}
                      onChange={handleChange}
                      required
                    >
                      <option value="Electronic Counter Scale">Electronic Counter Scale</option>
                      <option value="Electronic Platform Scale">Electronic Platform Scale</option>
                      <option value="Non-Automatic Weighing Instrument (NAWI)">Non-Automatic Weighing Instrument</option>
                      <option value="Automatic Weighing Instrument (AWI)">Automatic Weighing Instrument</option>
                      <option value="Precision / Analytical Balance (Class I/II)">Precision Balance (Class I/II)</option>
                      <option value="Weighbridge / Heavy Capacity Scale">Weighbridge / Heavy Scale</option>
                      <option value="Fuel Dispensing Unit / Flow Meter">Fuel Dispenser / Flow Meter</option>
                      <option value="Linear Measuring Instrument (Tape/Scale)">Linear Measuring Tape / Scale</option>
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Manufacturer Name *</label>
                      <input
                        type="text"
                        name="manufacturer"
                        className="form-control"
                        placeholder="e.g. Avery India"
                        value={formData.manufacturer}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Model Designation *</label>
                      <input
                        type="text"
                        name="model"
                        className="form-control"
                        placeholder="e.g. AV-30C"
                        value={formData.model}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Stamped Manufacturer Serial Number *</label>
                    <input
                      type="text"
                      name="serialNumber"
                      className="form-control font-monospace"
                      placeholder="e.g. SN-2026-98124"
                      value={formData.serialNumber}
                      onChange={handleChange}
                      required
                    />
                    <small className="text-muted">Must match the physical stamped plate on the instrument.</small>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-8">
                      <label className="form-label">Rated Capacity *</label>
                      <input
                        type="number"
                        step="any"
                        name="capacity"
                        className="form-control"
                        placeholder="e.g. 30"
                        value={formData.capacity}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Unit *</label>
                      <select name="unit" className="form-select" value={formData.unit} onChange={handleChange}>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="mg">mg</option>
                        <option value="ton">ton</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="m">m</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Premises / Counter Location *</label>
                    <input
                      type="text"
                      name="location"
                      className="form-control"
                      placeholder="e.g. Cashier Counter 1"
                      value={formData.location}
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
                    {submitting ? 'Saving to DB...' : 'Save & Register'}
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

export default Instruments;
