import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NewApplication = () => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    instrumentId: '',
    applicationType: 'INITIAL',
    remarks: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('INVOICE');

  const navigate = useNavigate();

  useEffect(() => {
    const loadInstruments = async () => {
      try {
        const res = await api.get('/instruments');
        if (res.success) {
          setInstruments(res.data);
          if (res.data.length > 0) {
            setFormData((prev) => ({ ...prev, instrumentId: res.data[0]._id }));
          }
        }
      } catch (err) {
        setError('Failed to load registered instruments');
      } finally {
        setLoading(false);
      }
    };

    loadInstruments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.instrumentId) {
      setError('Please select an instrument to verify');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Create Application
      const appRes = await api.post('/applications', formData);

      if (!appRes.success) {
        throw new Error(appRes.message || 'Failed to submit application');
      }

      const createdApp = appRes.data;

      // 2. Upload Document if selected
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('document', selectedFile);
        uploadData.append('applicationId', createdApp._id);
        uploadData.append('documentType', documentType);

        await api.post('/applications/documents/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Navigate to application details tracking page
      navigate(`/applicant/applications/${createdApp._id}`);
    } catch (err) {
      setError(err.message || 'Error submitting application');
      setSubmitting(false);
    }
  };

  return (
    <div className="new-application">
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">Apply for Verification & Calibration</h3>
        <p className="text-muted small mb-0">
          Submit statutory verification request under the Legal Metrology Act, 2009
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="gov-card p-4 p-md-5">
            {error && <div className="alert alert-danger py-2 px-3 small mb-4">{error}</div>}

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary"></div>
                <span className="ms-2 text-muted small">Loading instruments...</span>
              </div>
            ) : instruments.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-exclamation-circle text-warning display-5 d-block mb-3"></i>
                <h5 className="fw-bold text-navy">No Registered Instruments Found</h5>
                <p className="text-muted small mb-4">
                  You must register an instrument before you can submit a verification application.
                </p>
                <button
                  className="btn btn-gov-primary btn-sm"
                  onClick={() => navigate('/applicant/instruments')}
                >
                  <i className="bi bi-plus-circle me-1"></i> Register Instrument First
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label">
                    Select Instrument to Verify <span className="text-danger">*</span>
                  </label>
                  <select
                    name="instrumentId"
                    className="form-select"
                    value={formData.instrumentId}
                    onChange={handleChange}
                    required
                  >
                    {instruments.map((inst) => (
                      <option key={inst._id} value={inst._id}>
                        {inst.model} — {inst.instrumentType} (SN: {inst.serialNumber}, {inst.capacity} {inst.unit})
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Choose from instruments already registered under your establishment profile.
                  </small>
                </div>

                <div className="mb-4">
                  <label className="form-label">
                    Application Classification Type <span className="text-danger">*</span>
                  </label>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <div className="form-check p-3 border rounded">
                        <input
                          type="radio"
                          id="initial"
                          name="applicationType"
                          value="INITIAL"
                          checked={formData.applicationType === 'INITIAL'}
                          onChange={handleChange}
                          className="form-check-input"
                        />
                        <label htmlFor="initial" className="form-check-label fw-bold">
                          Initial Verification
                        </label>
                        <small className="d-block text-muted">For brand new unverified instruments</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check p-3 border rounded">
                        <input
                          type="radio"
                          id="renewal"
                          name="applicationType"
                          value="RENEWAL"
                          checked={formData.applicationType === 'RENEWAL'}
                          onChange={handleChange}
                          className="form-check-input"
                        />
                        <label htmlFor="renewal" className="form-check-label fw-bold">
                          Periodic Re-verification
                        </label>
                        <small className="d-block text-muted">Annual statutory calibration renewal</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check p-3 border rounded">
                        <input
                          type="radio"
                          id="reverif"
                          name="applicationType"
                          value="RE_VERIFICATION"
                          checked={formData.applicationType === 'RE_VERIFICATION'}
                          onChange={handleChange}
                          className="form-check-input"
                        />
                        <label htmlFor="reverif" className="form-check-label fw-bold">
                          Post-Repair Verification
                        </label>
                        <small className="d-block text-muted">Following service, adjustment or repair</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Upload Supporting Document (Optional)</label>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                      >
                        <option value="INVOICE">Purchase Invoice</option>
                        <option value="MODEL_APPROVAL">Model Approval Certificate</option>
                        <option value="PREVIOUS_CERTIFICATE">Previous Verification Slip</option>
                        <option value="CALIBRATION_REPORT">Manufacturer Calibration Slip</option>
                        <option value="OTHER">Other Proof</option>
                      </select>
                    </div>
                    <div className="col-md-8">
                      <input
                        type="file"
                        className="form-control"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  <small className="text-muted">Allowed formats: PDF, JPG, PNG (Max 10MB)</small>
                </div>

                <div className="mb-4">
                  <label className="form-label">Applicant Remarks / Special Instructions</label>
                  <textarea
                    name="remarks"
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Instrument available at warehouse counter on weekdays 10 AM to 5 PM"
                    value={formData.remarks}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/applicant/applications')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gov-primary px-4 fw-bold" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill me-2"></i>
                        Submit Verification Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewApplication;
