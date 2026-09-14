import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import VerificationAddressForm from '../../components/VerificationAddressForm';

const Instruments = () => {
  const [instruments, setInstruments] = useState([]);
  const [business, setBusiness] = useState(null);
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
    premisesDescription: 'Main Store Counter',
  });

  const [useBusinessAddress, setUseBusinessAddress] = useState(true);
  const [customAddress, setCustomAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    locality: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: null,
    longitude: null,
    isLocationConfirmed: false,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [instRes, bizRes] = await Promise.all([
        api.get('/instruments'),
        api.get('/business'),
      ]);
      if (instRes.success) {
        setInstruments(instRes.data);
      }
      if (bizRes.success) {
        setBusiness(bizRes.data);
      }
    } catch (err) {
      setError('Failed to fetch instruments or business profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateInstrument = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // If custom location is selected, ensure it has been confirmed or geocoded
    if (!useBusinessAddress && (!customAddress.latitude || !customAddress.longitude)) {
      setError('Please locate and confirm the instrument physical verification location on the map');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity),
        useBusinessAddress,
      };

      if (!useBusinessAddress) {
        payload.verificationAddress = {
          addressLine1: customAddress.addressLine1,
          addressLine2: customAddress.addressLine2,
          locality: customAddress.locality,
          landmark: customAddress.landmark,
          city: customAddress.city,
          district: customAddress.district,
          state: customAddress.state,
          country: customAddress.country || 'India',
          pincode: customAddress.pincode,
        };
        payload.coordinates = [customAddress.longitude, customAddress.latitude]; // [lng, lat]
        payload.isLocationConfirmed = customAddress.isLocationConfirmed;
      }

      const res = await api.post('/instruments', payload);

      if (res.success) {
        setSuccess('Instrument registered successfully with verification location!');
        setShowModal(false);
        setFormData({
          instrumentType: 'Electronic Counter Scale',
          manufacturer: '',
          model: '',
          serialNumber: '',
          capacity: '',
          unit: 'kg',
          premisesDescription: 'Main Store Counter',
        });
        setUseBusinessAddress(true);
        fetchData();
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
                  <th>Manufacturer / Model</th>
                  <th>Serial Number</th>
                  <th>Capacity</th>
                  <th>Premises Spot</th>
                  <th>Verification Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((inst) => {
                  const hasCoords = inst.location?.coordinates && inst.location.coordinates.length === 2;
                  const locDistrict = inst.verificationAddress?.district || inst.business?.district || 'Registered Premises';
                  return (
                    <tr key={inst._id}>
                      <td className="fw-semibold text-navy">{inst.instrumentType}</td>
                      <td>
                        <div className="fw-bold text-dark">{inst.model}</div>
                        <small className="text-muted">{inst.manufacturer}</small>
                      </td>
                      <td className="font-monospace text-primary fw-bold">{inst.serialNumber}</td>
                      <td>
                        {inst.capacity} {inst.unit}
                      </td>
                      <td className="small text-muted">{inst.premisesDescription || inst.location || '-'}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <i className={`bi ${hasCoords ? 'bi-geo-alt-fill text-success' : 'bi-geo-alt text-warning'}`}></i>
                          <span className="small fw-semibold">{locDistrict}</span>
                        </div>
                        {hasCoords ? (
                          <div className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                            {inst.location.coordinates[1].toFixed(4)}, {inst.location.coordinates[0].toFixed(4)}
                          </div>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border" style={{ fontSize: '0.68rem' }}>
                            No Coordinates
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={inst.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Instrument Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-speedometer2 text-primary me-2"></i>
                  Register Commercial Instrument
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleCreateInstrument}>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
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
                    <label className="form-label">Premises Spot / Counter Description *</label>
                    <input
                      type="text"
                      name="premisesDescription"
                      className="form-control"
                      placeholder="e.g. Billing Counter 1 / Gate 2 Inbound Scale"
                      value={formData.premisesDescription}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Physical Verification Location Section */}
                  <div className="p-3 border rounded bg-light mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold text-navy mb-0">
                        <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                        Physical Verification Location
                      </h6>
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="useBusinessAddrSwitch"
                          checked={useBusinessAddress}
                          onChange={(e) => setUseBusinessAddress(e.target.checked)}
                        />
                        <label className="form-check-label small fw-bold" htmlFor="useBusinessAddrSwitch">
                          Use Business Address
                        </label>
                      </div>
                    </div>

                    {useBusinessAddress ? (
                      <div className="p-3 bg-white rounded border">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-primary-subtle text-primary border">
                            <i className="bi bi-building me-1"></i> Inherited from Business Profile
                          </span>
                          {business?.location?.coordinates && (
                            <span className="badge bg-success-subtle text-success border font-monospace">
                              ✓ {business.location.coordinates[1].toFixed(4)}, {business.location.coordinates[0].toFixed(4)}
                            </span>
                          )}
                        </div>
                        <div className="small text-dark fw-semibold mt-1">
                          {business?.businessName}
                        </div>
                        <div className="text-muted small">
                          {[business?.addressLine1 || business?.address, business?.district, business?.state, business?.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <VerificationAddressForm
                          address={customAddress}
                          onChange={setCustomAddress}
                          onLocationConfirmed={(lat, lng, updated) => setCustomAddress(updated)}
                          title="Instrument Specific Verification Location"
                          description="Specify distinct physical premises if this instrument is in use in a different city or branch"
                          isConfirmed={customAddress.isLocationConfirmed}
                        />
                      </div>
                    )}
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
