import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getFileDownloadUrl } from '../../services/api';
import ReceiptModal from '../../components/ReceiptModal';
import VerificationAddressForm from '../../components/VerificationAddressForm';
import LocationPickerMap from '../../components/LocationPickerMap';

// Frontend fee calculation helper matching Legal Metrology statutory rules
const calculateStatutoryFee = (instrument, applicationType = 'INITIAL') => {
  if (!instrument) return null;
  const type = instrument.instrumentType || 'Electronic Counter Scale';
  const capacity = Number(instrument.capacity) || 0;
  const unit = (instrument.unit || 'kg').toLowerCase();

  let baseStatutoryFee = 300;
  let machineCategoryDescription = '';

  if (type === 'Electronic Counter Scale') {
    if (capacity <= 15) {
      baseStatutoryFee = 200;
      machineCategoryDescription = 'Counter Scale (Light Capacity <= 15 kg)';
    } else {
      baseStatutoryFee = 350;
      machineCategoryDescription = 'Counter Scale (Standard Commercial > 15 kg)';
    }
  } else if (type === 'Electronic Platform Scale') {
    if (capacity <= 100) {
      baseStatutoryFee = 500;
      machineCategoryDescription = 'Platform Scale (Medium Capacity <= 100 kg)';
    } else if (capacity <= 300) {
      baseStatutoryFee = 750;
      machineCategoryDescription = 'Platform Scale (Industrial 100 kg - 300 kg)';
    } else {
      baseStatutoryFee = 1000;
      machineCategoryDescription = 'Platform Scale (Heavy Duty > 300 kg)';
    }
  } else if (type === 'Weighbridge / Heavy Capacity Scale') {
    if (unit === 'ton') {
      if (capacity <= 30) {
        baseStatutoryFee = 2500;
        machineCategoryDescription = 'Heavy Weighbridge (Capacity <= 30 Ton)';
      } else if (capacity <= 60) {
        baseStatutoryFee = 3500;
        machineCategoryDescription = 'Heavy Weighbridge (Capacity 30 - 60 Ton)';
      } else {
        baseStatutoryFee = 5000;
        machineCategoryDescription = 'Extra-Heavy Industrial Weighbridge (> 60 Ton)';
      }
    } else {
      baseStatutoryFee = 3000;
      machineCategoryDescription = 'Heavy Duty Weighbridge';
    }
  } else if (type === 'Precision / Analytical Balance (Class I/II)') {
    baseStatutoryFee = 1200;
    machineCategoryDescription = 'High-Precision Analytical Balance (Class I/II Micro-Weighing)';
  } else if (type === 'Fuel Dispensing Unit / Flow Meter') {
    baseStatutoryFee = 1800;
    machineCategoryDescription = 'Fuel Dispenser Flow Meter Unit (Statutory Verification)';
  } else if (type === 'Automatic Weighing Instrument (AWI)') {
    baseStatutoryFee = 1400;
    machineCategoryDescription = 'Automated Continuous Weighing Instrument';
  } else if (type === 'Non-Automatic Weighing Instrument (NAWI)') {
    baseStatutoryFee = 450;
    machineCategoryDescription = 'Standard NAWI Commercial Scale';
  } else if (type === 'Linear Measuring Instrument (Tape/Scale)') {
    baseStatutoryFee = 150;
    machineCategoryDescription = 'Linear Measure (Rigid Scale / Steel Tape)';
  } else if (type === 'Capacity Measure / Storage Tank') {
    baseStatutoryFee = 600;
    machineCategoryDescription = 'Volumetric Capacity Measure / Storage Vessel';
  } else {
    baseStatutoryFee = 400;
    machineCategoryDescription = 'Specialized Measuring Instrument';
  }

  let typeMultiplier = 1.0;
  if (applicationType === 'RE_VERIFICATION') {
    typeMultiplier = 1.25;
  } else if (applicationType === 'RENEWAL') {
    typeMultiplier = 1.0;
  }

  const statutoryFee = Math.round(baseStatutoryFee * typeMultiplier);
  const inspectionFee = Math.max(100, Math.round(statutoryFee * 0.2));
  const subtotal = statutoryFee + inspectionFee;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const totalAmount = Math.round(subtotal + totalGst);

  return {
    machineCategoryDescription,
    statutoryFee,
    inspectionFee,
    subtotal,
    cgst,
    sgst,
    totalGst,
    totalAmount,
  };
};

const NewApplication = () => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step state: 1 = Details, 2 = Payment Review, 3 = Completed with Receipt
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    instrumentId: '',
    applicationType: 'INITIAL',
    remarks: '',
    paymentMethod: 'UPI',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('INVOICE');

  // Inline address configuration state (if selected instrument lacks coordinates)
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [addressFormData, setAddressFormData] = useState({
    premisesDescription: '',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    landmark: '',
    city: '',
    district: '',
    state: 'Delhi',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null,
    isLocationConfirmed: false,
  });
  const [savingLocation, setSavingLocation] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);

  // Success result state
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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

  // Find currently selected instrument object
  const selectedInstrument = instruments.find((i) => i._id === formData.instrumentId);

  // Auto-populate addressFormData whenever selected instrument changes
  useEffect(() => {
    if (selectedInstrument) {
      const vAddr = selectedInstrument.verificationAddress || {};
      const coords = selectedInstrument.location?.coordinates || [];
      const hasCoords = coords.length === 2 && !(coords[0] === 0 && coords[1] === 0);

      setAddressFormData({
        premisesDescription: selectedInstrument.premisesDescription || '',
        addressLine1: vAddr.addressLine1 || '',
        addressLine2: vAddr.addressLine2 || '',
        locality: vAddr.locality || '',
        landmark: vAddr.landmark || '',
        city: vAddr.city || '',
        district: vAddr.district || '',
        state: vAddr.state || 'Delhi',
        pincode: vAddr.pincode || '',
        country: vAddr.country || 'India',
        latitude: hasCoords ? coords[1] : null,
        longitude: hasCoords ? coords[0] : null,
        isLocationConfirmed: selectedInstrument.isLocationConfirmed || hasCoords,
      });
    }
  }, [selectedInstrument?._id]);

  // Check if selected instrument has valid geo coordinates
  const hasValidCoordinates = Boolean(
    selectedInstrument?.location?.coordinates &&
    selectedInstrument.location.coordinates.length === 2 &&
    !(selectedInstrument.location.coordinates[0] === 0 && selectedInstrument.location.coordinates[1] === 0)
  );

  const instLng = hasValidCoordinates ? selectedInstrument.location.coordinates[0] : null;
  const instLat = hasValidCoordinates ? selectedInstrument.location.coordinates[1] : null;

  // Compute real-time statutory fee based on machine
  const feeEstimate = calculateStatutoryFee(selectedInstrument, formData.applicationType);

  // Handle saving inline address to instrument
  const handleSaveInlineLocation = async () => {
    try {
      setSavingLocation(true);
      setError('');

      let lat = addressFormData.latitude;
      let lng = addressFormData.longitude;

      // If user hasn't explicitly clicked "Locate" on map, auto-geocode now
      if (!lat || !lng) {
        if (!addressFormData.district && !addressFormData.city && !addressFormData.pincode) {
          setError('Please provide city, district, and pincode to locate this premises.');
          setSavingLocation(false);
          return;
        }

        const geoRes = await api.post('/geocoding/geocode', {
          addressLine1: addressFormData.addressLine1,
          addressLine2: addressFormData.addressLine2,
          locality: addressFormData.locality,
          landmark: addressFormData.landmark,
          city: addressFormData.city,
          district: addressFormData.district,
          state: addressFormData.state,
          country: addressFormData.country || 'India',
          pincode: addressFormData.pincode,
        });

        if (geoRes.success && geoRes.data?.latitude && geoRes.data?.longitude) {
          lat = geoRes.data.latitude;
          lng = geoRes.data.longitude;
          setAddressFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            isLocationConfirmed: true,
          }));
        } else {
          setError(geoRes.message || 'Could not locate address coordinates. Please check PIN code.');
          setSavingLocation(false);
          return;
        }
      }

      const res = await api.put(`/instruments/${selectedInstrument._id}/location`, {
        premisesDescription: addressFormData.premisesDescription || 'Verification Premises',
        verificationAddress: {
          addressLine1: addressFormData.addressLine1,
          addressLine2: addressFormData.addressLine2,
          locality: addressFormData.locality,
          landmark: addressFormData.landmark,
          city: addressFormData.city,
          district: addressFormData.district,
          state: addressFormData.state,
          pincode: addressFormData.pincode,
          country: addressFormData.country || 'India',
        },
        coordinates: [Number(lng), Number(lat)],
        location: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        isLocationConfirmed: true,
        useBusinessAddress: false,
      });

      if (res.success) {
        setInstruments((prev) =>
          prev.map((i) => (i._id === selectedInstrument._id ? res.data : i))
        );
        setShowAddressEditor(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to update instrument location');
    } finally {
      setSavingLocation(false);
    }
  };

  // Proceed from Step 1 to Step 2
  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    if (!formData.instrumentId) {
      setError('Please select an instrument to verify');
      return;
    }

    if (!hasValidCoordinates) {
      // Auto-geocode fallback on proceed if address fields exist
      const addr = selectedInstrument?.verificationAddress || addressFormData;
      if (addr && (addr.district || addr.city || addr.pincode)) {
        try {
          setLoading(true);
          const geoRes = await api.post('/geocoding/geocode', {
            addressLine1: addr.addressLine1,
            locality: addr.locality,
            city: addr.city,
            district: addr.district,
            state: addr.state,
            pincode: addr.pincode,
          });

          if (geoRes.success && geoRes.data?.latitude && geoRes.data?.longitude) {
            const updateRes = await api.put(`/instruments/${selectedInstrument._id}/location`, {
              verificationAddress: {
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2 || '',
                locality: addr.locality || '',
                landmark: addr.landmark || '',
                city: addr.city || '',
                district: addr.district || '',
                state: addr.state || '',
                pincode: addr.pincode || '',
                country: addr.country || 'India',
              },
              coordinates: [geoRes.data.longitude, geoRes.data.latitude],
              location: {
                type: 'Point',
                coordinates: [geoRes.data.longitude, geoRes.data.latitude],
              },
              isLocationConfirmed: true,
              useBusinessAddress: false,
            });

            if (updateRes.success) {
              setInstruments((prev) =>
                prev.map((i) => (i._id === selectedInstrument._id ? updateRes.data : i))
              );
              setError('');
              setStep(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
          }
        } catch (autoErr) {
          console.warn('Auto geocode on proceed attempt error:', autoErr);
        } finally {
          setLoading(false);
        }
      }

      setError('A verified physical address and geocoded location are required for this machine before proceeding.');
      setShowAddressEditor(true);
      return;
    }

    setError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submit & Payment Execution
  const handleFinalSubmitWithPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // 1. Submit Application with Payment method
      const appRes = await api.post('/applications', {
        instrumentId: formData.instrumentId,
        applicationType: formData.applicationType,
        remarks: formData.remarks,
        paymentMethod: formData.paymentMethod,
        payFee: true,
      });

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

        try {
          await api.post('/applications/documents/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.warn('Document upload warning:', uploadErr.message);
        }
      }

      // 3. Fetch full receipt details
      let paymentData = createdApp.payment;
      if (!paymentData || typeof paymentData === 'string') {
        try {
          const receiptRes = await api.get(`/payments/application/${createdApp._id}`);
          if (receiptRes.success) {
            paymentData = receiptRes.data;
          }
        } catch (rErr) {
          console.warn('Receipt fetch warning:', rErr);
        }
      }

      setSubmissionResult({
        application: createdApp,
        payment: paymentData || {
          receiptNumber: createdApp.receiptNumber || 'RCP-SUCCESS',
          transactionId: `TXN-${Date.now()}`,
          totalAmount: feeEstimate?.totalAmount || 0,
          paymentMethod: formData.paymentMethod,
          paidAt: new Date(),
          application: createdApp,
          instrument: selectedInstrument,
          feeBreakdown: feeEstimate,
        },
      });

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Error processing payment and submitting application');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-application">
      {/* Header Banner */}
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">
          <i className="bi bi-file-earmark-medical-fill text-primary me-2"></i>
          Apply for Verification & Calibration
        </h3>
        <p className="text-muted small mb-0">
          Statutory verification request and machine fee assessment under Legal Metrology Act, 2009
        </p>
      </div>

      {/* Progress Steps Indicator */}
      <div className="row justify-content-center mb-4">
        <div className="col-lg-10">
          <div className="d-flex justify-content-between position-relative px-2">
            <div className="text-center position-relative" style={{ zIndex: 2 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${
                  step >= 1 ? 'bg-primary text-white' : 'bg-light text-muted border'
                }`}
                style={{ width: '36px', height: '36px', fontWeight: 'bold' }}
              >
                1
              </div>
              <small className={`fw-semibold ${step >= 1 ? 'text-primary' : 'text-muted'}`}>
                Machine Details
              </small>
            </div>

            <div className="text-center position-relative" style={{ zIndex: 2 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${
                  step >= 2 ? 'bg-primary text-white' : 'bg-light text-muted border'
                }`}
                style={{ width: '36px', height: '36px', fontWeight: 'bold' }}
              >
                2
              </div>
              <small className={`fw-semibold ${step >= 2 ? 'text-primary' : 'text-muted'}`}>
                Statutory Payment
              </small>
            </div>

            <div className="text-center position-relative" style={{ zIndex: 2 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${
                  step === 3 ? 'bg-success text-white' : 'bg-light text-muted border'
                }`}
                style={{ width: '36px', height: '36px', fontWeight: 'bold' }}
              >
                ✓
              </div>
              <small className={`fw-semibold ${step === 3 ? 'text-success' : 'text-muted'}`}>
                Official Receipt
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10">
          {error && <div className="alert alert-danger py-2 px-3 small mb-4">{error}</div>}

          {loading ? (
            <div className="text-center py-5 gov-card">
              <div className="spinner-border text-primary" role="status"></div>
              <div className="mt-2 text-muted small">Loading registered instruments...</div>
            </div>
          ) : instruments.length === 0 ? (
            <div className="gov-card p-5 text-center">
              <i className="bi bi-exclamation-triangle text-warning display-4 d-block mb-3"></i>
              <h5 className="fw-bold text-navy">No Registered Instruments Found</h5>
              <p className="text-muted small mb-4">
                You must register an instrument before you can submit a statutory verification request.
              </p>
              <button
                className="btn btn-gov-primary btn-sm"
                onClick={() => navigate('/applicant/instruments')}
              >
                <i className="bi bi-plus-circle me-1"></i> Register Instrument First
              </button>
            </div>
          ) : (
            <>
              {/* ================= STEP 1: MACHINE & APPLICATION DETAILS ================= */}
              {step === 1 && (
                <div className="gov-card p-4 p-md-5">
                  <h5 className="fw-bold text-navy border-bottom pb-2 mb-4">
                    <i className="bi bi-speedometer2 text-primary me-2"></i>
                    Step 1: Select Instrument & Verification Particulars
                  </h5>

                  <form onSubmit={handleProceedToPayment}>
                    {/* Instrument Selector */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        Select Weighing / Measuring Machine <span className="text-danger">*</span>
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
                        Statutory verification fee will be assessed directly based on the selected machine's category and rated capacity.
                      </small>
                    </div>

                    {/* LIVE STATUTORY FEE SCHEDULE PREVIEW ACCORDING TO MACHINE */}
                    {selectedInstrument && feeEstimate && (
                      <div className="p-3 mb-4 rounded border bg-light-subtle border-primary-subtle">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold">
                            <i className="bi bi-calculator-fill me-1"></i>
                            Statutory Fee Assessment for this Machine
                          </span>
                          <span className="text-muted small font-monospace">
                            Capacity: {selectedInstrument.capacity} {selectedInstrument.unit}
                          </span>
                        </div>
                        <div className="row g-2 align-items-center">
                          <div className="col-md-7 small">
                            <div className="fw-bold text-navy">{feeEstimate.machineCategoryDescription}</div>
                            <div className="text-muted">
                              Base Statutory Fee: <strong>₹{feeEstimate.statutoryFee}</strong> + Calibration Testing: <strong>₹{feeEstimate.inspectionFee}</strong>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                              Subtotal: ₹{feeEstimate.subtotal} • GST @ 18% (CGST 9% + SGST 9%): ₹{feeEstimate.totalGst}
                            </div>
                          </div>
                          <div className="col-md-5 text-md-end">
                            <span className="text-muted small d-block">Total Statutory Fee Payable:</span>
                            <span className="fs-4 fw-bold text-success font-monospace">
                              ₹ {feeEstimate.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VERIFICATION LOCATION & GEOCODING CARD */}
                    {selectedInstrument && (
                      hasValidCoordinates ? (
                        <div className="p-3 mb-4 rounded border bg-white shadow-sm">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold text-navy mb-0">
                              <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                              Verification Premises & Coordinates
                            </h6>
                            <span className="badge bg-success-subtle text-success border border-success fw-semibold">
                              <i className="bi bi-check-circle-fill me-1"></i> Geocoded & Verified
                            </span>
                          </div>
                          <div className="row g-2 small mb-2">
                            <div className="col-md-3 text-muted">Premises / Spot:</div>
                            <div className="col-md-9 fw-semibold text-dark">
                              {selectedInstrument.premisesDescription || 'Standard Premises'}
                            </div>

                            <div className="col-md-3 text-muted">Verification Address:</div>
                            <div className="col-md-9">
                              {[
                                selectedInstrument.verificationAddress?.addressLine1,
                                selectedInstrument.verificationAddress?.addressLine2,
                                selectedInstrument.verificationAddress?.locality,
                                selectedInstrument.verificationAddress?.city,
                                selectedInstrument.verificationAddress?.district,
                                selectedInstrument.verificationAddress?.state,
                                selectedInstrument.verificationAddress?.pincode,
                              ].filter(Boolean).join(', ') || 'Address on record'}
                            </div>

                            <div className="col-md-3 text-muted">Geocoded Coordinates:</div>
                            <div className="col-md-9 font-monospace text-primary fw-semibold">
                              <i className="bi bi-crosshair me-1"></i>
                              Lat: {instLat?.toFixed(6)}, Lng: {instLng?.toFixed(6)}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setShowMapPreview(!showMapPreview)}
                            >
                              <i className={`bi bi-${showMapPreview ? 'eye-slash' : 'map'} me-1`}></i>
                              {showMapPreview ? 'Hide Map Preview' : 'Show Location on Map'}
                            </button>
                            <small className="text-muted">
                              <i className="bi bi-shield-check text-success me-1"></i>
                              Nearest Legal Metrology Officer will be auto-assigned within jurisdiction.
                            </small>
                          </div>

                          {showMapPreview && instLat && instLng && (
                            <div className="mt-3">
                              <LocationPickerMap
                                latitude={instLat}
                                longitude={instLng}
                                isConfirmed={true}
                                label={selectedInstrument.model}
                                addressPreview={selectedInstrument.verificationAddress?.addressLine1 || selectedInstrument.premisesDescription}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="alert alert-warning p-3 rounded border mb-4">
                          <div className="d-flex align-items-start justify-content-between">
                            <div>
                              <h6 className="fw-bold text-dark mb-1">
                                <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                                Physical Verification Address & Coordinates Required
                              </h6>
                              <p className="small text-muted mb-0">
                                This instrument has no confirmed geocoded location. An accurate location is mandatory for statutory inspection dispatch and automatic nearest-officer allocation.
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-warning fw-bold text-dark text-nowrap ms-3"
                              onClick={() => setShowAddressEditor(!showAddressEditor)}
                            >
                              <i className={`bi bi-${showAddressEditor ? 'dash' : 'plus'}-circle me-1`}></i>
                              {showAddressEditor ? 'Close Form' : 'Configure Address'}
                            </button>
                          </div>

                          {showAddressEditor && (
                            <div className="mt-3 pt-3 border-top bg-white p-3 rounded">
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">Premises / Machine Spot Description</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="e.g. Counter 1 (Billing) / Main Warehouse Weighbridge"
                                  value={addressFormData.premisesDescription}
                                  onChange={(e) => setAddressFormData({ ...addressFormData, premisesDescription: e.target.value })}
                                />
                              </div>

                              <VerificationAddressForm
                                address={addressFormData}
                                onChange={(updated) => setAddressFormData(updated)}
                                onLocationConfirmed={(lat, lng, updated) => setAddressFormData(updated)}
                                isConfirmed={addressFormData.isLocationConfirmed}
                                title="Configure Verification Address"
                                description="Enter physical premises address & locate on map to enable automatic officer allocation"
                              />

                              <div className="text-end mt-2">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm fw-bold"
                                  disabled={savingLocation || !addressFormData.isLocationConfirmed}
                                  onClick={handleSaveInlineLocation}
                                >
                                  {savingLocation ? 'Saving Location...' : 'Save & Confirm Location'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Application Classification */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        Application Classification Type <span className="text-danger">*</span>
                      </label>
                      <div className="row g-2">
                        <div className="col-md-4">
                          <div
                            className={`p-3 border rounded cursor-pointer ${
                              formData.applicationType === 'INITIAL' ? 'border-primary bg-primary-subtle' : 'bg-white'
                            }`}
                            onClick={() => setFormData({ ...formData, applicationType: 'INITIAL' })}
                          >
                            <div className="form-check">
                              <input
                                type="radio"
                                id="initial"
                                name="applicationType"
                                value="INITIAL"
                                checked={formData.applicationType === 'INITIAL'}
                                onChange={handleChange}
                                className="form-check-input"
                              />
                              <label htmlFor="initial" className="form-check-label fw-bold text-navy">
                                Initial Verification
                              </label>
                            </div>
                            <small className="d-block text-muted ps-4">For brand new unverified machines</small>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div
                            className={`p-3 border rounded cursor-pointer ${
                              formData.applicationType === 'RENEWAL' ? 'border-primary bg-primary-subtle' : 'bg-white'
                            }`}
                            onClick={() => setFormData({ ...formData, applicationType: 'RENEWAL' })}
                          >
                            <div className="form-check">
                              <input
                                type="radio"
                                id="renewal"
                                name="applicationType"
                                value="RENEWAL"
                                checked={formData.applicationType === 'RENEWAL'}
                                onChange={handleChange}
                                className="form-check-input"
                              />
                              <label htmlFor="renewal" className="form-check-label fw-bold text-navy">
                                Periodic Re-verification
                              </label>
                            </div>
                            <small className="d-block text-muted ps-4">Annual statutory calibration renewal</small>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div
                            className={`p-3 border rounded cursor-pointer ${
                              formData.applicationType === 'RE_VERIFICATION' ? 'border-primary bg-primary-subtle' : 'bg-white'
                            }`}
                            onClick={() => setFormData({ ...formData, applicationType: 'RE_VERIFICATION' })}
                          >
                            <div className="form-check">
                              <input
                                type="radio"
                                id="reverif"
                                name="applicationType"
                                value="RE_VERIFICATION"
                                checked={formData.applicationType === 'RE_VERIFICATION'}
                                onChange={handleChange}
                                className="form-check-input"
                              />
                              <label htmlFor="reverif" className="form-check-label fw-bold text-navy">
                                Post-Repair Verification
                              </label>
                            </div>
                            <small className="d-block text-muted ps-4">Following recalibration or repair</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Upload Supporting Document (Optional)</label>
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

                    {/* Remarks */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Applicant Remarks / Premises Notes</label>
                      <textarea
                        name="remarks"
                        className="form-control"
                        rows="2"
                        placeholder="e.g. Machine installed at main billing counter, available on weekdays 10 AM to 5 PM"
                        value={formData.remarks}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/applicant/applications')}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-gov-primary px-4 fw-bold">
                        Proceed to Statutory Payment (₹{feeEstimate?.totalAmount || '...'})
                        <i className="bi bi-arrow-right ms-2"></i>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ================= STEP 2: STATUTORY PAYMENT GATEWAY ================= */}
              {step === 2 && (
                <div className="gov-card p-4 p-md-5">
                  <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-4">
                    <h5 className="fw-bold text-navy mb-0">
                      <i className="bi bi-credit-card-2-front-fill text-success me-2"></i>
                      Step 2: Statutory Fee Payment & BharatKosh Gateway
                    </h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setStep(1)}
                    >
                      <i className="bi bi-arrow-left me-1"></i> Back to Machine Details
                    </button>
                  </div>

                  <div className="row g-4">
                    {/* Left Column: Machine & Invoice Summary */}
                    <div className="col-lg-6">
                      <div className="bg-light p-3 rounded border mb-3">
                        <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">
                          <i className="bi bi-speedometer2 text-primary me-2"></i>
                          Machine Specifications
                        </h6>
                        <div className="row g-2 small">
                          <div className="col-5 text-muted">Instrument:</div>
                          <div className="col-7 fw-semibold">{selectedInstrument?.model} ({selectedInstrument?.manufacturer})</div>

                          <div className="col-5 text-muted">Category:</div>
                          <div className="col-7">{selectedInstrument?.instrumentType}</div>

                          <div className="col-5 text-muted">Serial No:</div>
                          <div className="col-7 font-monospace fw-bold text-primary">{selectedInstrument?.serialNumber}</div>

                          <div className="col-5 text-muted">Capacity:</div>
                          <div className="col-7">{selectedInstrument?.capacity} {selectedInstrument?.unit}</div>

                          <div className="col-5 text-muted">Classification:</div>
                          <div className="col-7">
                            <span className="badge bg-light text-dark border">{formData.applicationType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Verification Premises & Geocoded Location in Step 2 */}
                      <div className="bg-light p-3 rounded border mb-3">
                        <h6 className="fw-bold text-navy border-bottom pb-2 mb-2">
                          <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                          Verification Premises Location
                        </h6>
                        <div className="small text-dark mb-1">
                          <strong>{selectedInstrument?.premisesDescription || 'Verification Premises'}</strong>
                        </div>
                        <div className="small text-muted mb-2">
                          {[
                            selectedInstrument?.verificationAddress?.addressLine1,
                            selectedInstrument?.verificationAddress?.addressLine2,
                            selectedInstrument?.verificationAddress?.locality,
                            selectedInstrument?.verificationAddress?.city,
                            selectedInstrument?.verificationAddress?.district,
                            selectedInstrument?.verificationAddress?.state,
                            selectedInstrument?.verificationAddress?.pincode,
                          ].filter(Boolean).join(', ')}
                        </div>
                        {instLat && instLng && (
                          <div className="font-monospace text-primary small">
                            <i className="bi bi-crosshair me-1"></i>
                            Coordinates: {instLat.toFixed(6)}, {instLng.toFixed(6)}
                          </div>
                        )}
                      </div>

                      {/* Fee Breakdown Table */}
                      <div className="bg-light p-3 rounded border">
                        <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">
                          <i className="bi bi-receipt text-primary me-2"></i>
                          Itemized Statutory Fee Breakdown
                        </h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-borderless small mb-2">
                            <tbody>
                              <tr>
                                <td>Statutory Verification & Stamping Fee:</td>
                                <td className="text-end fw-semibold">₹ {feeEstimate?.statutoryFee?.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td>Calibration Inspection Surcharge:</td>
                                <td className="text-end fw-semibold">₹ {feeEstimate?.inspectionFee?.toFixed(2)}</td>
                              </tr>
                              <tr className="border-top">
                                <td>Subtotal:</td>
                                <td className="text-end fw-bold">₹ {feeEstimate?.subtotal?.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="text-muted">Central GST (CGST @ 9%):</td>
                                <td className="text-end text-muted">₹ {feeEstimate?.cgst?.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="text-muted">State GST (SGST @ 9%):</td>
                                <td className="text-end text-muted">₹ {feeEstimate?.sgst?.toFixed(2)}</td>
                              </tr>
                              <tr className="border-top border-2 border-primary table-primary">
                                <td className="fw-bold text-navy fs-6">Total Amount Payable:</td>
                                <td className="text-end fw-bold text-navy fs-5 font-monospace">
                                  ₹ {feeEstimate?.totalAmount?.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <small className="text-muted d-block">
                          Official receipt will be generated instantly upon confirmation.
                        </small>
                      </div>
                    </div>

                    {/* Right Column: Payment Method Selection & Action */}
                    <div className="col-lg-6">
                      <div className="bg-white p-3 rounded border shadow-sm h-100 d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="fw-bold text-navy mb-3">
                            <i className="bi bi-wallet2 text-success me-2"></i>
                            Select Payment Method
                          </h6>

                          <div className="d-flex flex-column gap-2 mb-4">
                            {/* UPI Mode */}
                            <label
                              className={`p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer ${
                                formData.paymentMethod === 'UPI' ? 'border-success bg-success-subtle' : ''
                              }`}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="UPI"
                                  checked={formData.paymentMethod === 'UPI'}
                                  onChange={handleChange}
                                  className="form-check-input mt-0"
                                />
                                <div>
                                  <div className="fw-bold text-dark">UPI / QR Code</div>
                                  <small className="text-muted">Google Pay, PhonePe, Paytm, BHIM</small>
                                </div>
                              </div>
                              <i className="bi bi-qr-code text-primary fs-3"></i>
                            </label>

                            {/* Net Banking */}
                            <label
                              className={`p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer ${
                                formData.paymentMethod === 'NET_BANKING' ? 'border-success bg-success-subtle' : ''
                              }`}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="NET_BANKING"
                                  checked={formData.paymentMethod === 'NET_BANKING'}
                                  onChange={handleChange}
                                  className="form-check-input mt-0"
                                />
                                <div>
                                  <div className="fw-bold text-dark">Net Banking</div>
                                  <small className="text-muted">SBI, HDFC, ICICI, PNB, BoB, Axis</small>
                                </div>
                              </div>
                              <i className="bi bi-bank2 text-primary fs-4"></i>
                            </label>

                            {/* Debit / Credit Card */}
                            <label
                              className={`p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer ${
                                formData.paymentMethod === 'DEBIT_CARD' ? 'border-success bg-success-subtle' : ''
                              }`}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="DEBIT_CARD"
                                  checked={formData.paymentMethod === 'DEBIT_CARD'}
                                  onChange={handleChange}
                                  className="form-check-input mt-0"
                                />
                                <div>
                                  <div className="fw-bold text-dark">Debit / Credit Card</div>
                                  <small className="text-muted">Visa, MasterCard, RuPay</small>
                                </div>
                              </div>
                              <i className="bi bi-credit-card text-primary fs-4"></i>
                            </label>

                            {/* Bharatkosh / Challan */}
                            <label
                              className={`p-3 border rounded d-flex align-items-center justify-content-between cursor-pointer ${
                                formData.paymentMethod === 'BHARATKOSH_CHALLAN' ? 'border-success bg-success-subtle' : ''
                              }`}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="BHARATKOSH_CHALLAN"
                                  checked={formData.paymentMethod === 'BHARATKOSH_CHALLAN'}
                                  onChange={handleChange}
                                  className="form-check-input mt-0"
                                />
                                <div>
                                  <div className="fw-bold text-dark">BharatKosh e-Treasury</div>
                                  <small className="text-muted">Govt Non-Tax Receipt Portal</small>
                                </div>
                              </div>
                              <i className="bi bi-shield-check text-primary fs-4"></i>
                            </label>
                          </div>

                          {/* Mode-specific visual prompt */}
                          {formData.paymentMethod === 'UPI' && (
                            <div className="p-2 mb-3 bg-light rounded text-center small border">
                              <span className="text-muted">Simulated Virtual Payment Address (VPA): </span>
                              <strong className="text-primary font-monospace">legal.metrology@sbi</strong>
                            </div>
                          )}
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn btn-success btn-lg w-100 fw-bold shadow-sm"
                            onClick={handleFinalSubmitWithPayment}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Settling Statutory Payment...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-lock-fill me-2"></i>
                                Pay ₹{feeEstimate?.totalAmount?.toFixed(2)} & Submit Application
                              </>
                            )}
                          </button>
                          <small className="text-muted text-center d-block mt-2" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-shield-lock me-1"></i>
                            256-bit SSL Encrypted • Direct Ministry of Consumer Affairs Settlement
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: SUCCESS & OFFICIAL RECEIPT DISPLAY ================= */}
              {step === 3 && submissionResult && (
                <div>
                  {/* Success Top Banner */}
                  <div className="alert alert-success p-4 rounded shadow-sm text-center mb-4">
                    <i className="bi bi-check-circle-fill text-success display-4 d-block mb-2"></i>
                    <h4 className="fw-bold text-success mb-1">
                      Statutory Payment Successful & Application Submitted!
                    </h4>
                    <p className="text-muted mb-3">
                      Your verification request has been registered under Application Number{' '}
                      <strong className="text-navy font-monospace">{submissionResult.application?.applicationNumber}</strong>
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm fw-bold"
                        onClick={() => setShowReceiptModal(true)}
                      >
                        <i className="bi bi-eye-fill me-1"></i> View Full Receipt Dialog
                      </button>
                      <a
                        href={getFileDownloadUrl(`/api/payments/${submissionResult.payment?._id || submissionResult.payment?.receiptNumber}/receipt/download`)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-success btn-sm fw-bold"
                      >
                        <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download Official PDF Receipt
                      </a>
                      <Link
                        to={`/applicant/applications/${submissionResult.application?._id}`}
                        className="btn btn-primary btn-sm"
                      >
                        <i className="bi bi-timeline me-1"></i> Track Verification Lifecycle
                      </Link>
                    </div>
                  </div>

                  {/* Automatic Officer Allocation Result Card */}
                  <div className="gov-card p-3 p-md-4 mb-4 border-start border-4 border-primary">
                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                      <div>
                        <span className="badge bg-primary mb-1">
                          <i className="bi bi-geo-alt-fill me-1"></i>
                          {submissionResult.application?.allocationMethod === 'AUTO_NEAREST'
                            ? 'Automated Nearest-Officer Allocation'
                            : 'Officer Allocation'}
                        </span>
                        <h6 className="fw-bold text-navy mb-1">
                          {submissionResult.application?.assignedOfficer ? (
                            <>
                              Assigned Legal Metrology Officer:{' '}
                              <span className="text-primary">{submissionResult.application.assignedOfficer.name}</span>
                            </>
                          ) : (
                            <span className="text-warning">Allocation In Progress / Awaiting Dispatch</span>
                          )}
                        </h6>
                        <p className="text-muted small mb-0">
                          {submissionResult.application?.assignedOfficer ? (
                            <>
                              Office Contact: {submissionResult.application.assignedOfficer.email} • Distance:{' '}
                              <strong className="text-dark">
                                {submissionResult.application.allocationDistance
                                  ? `${(submissionResult.application.allocationDistance / 1000).toFixed(1)} km away`
                                  : 'Within Local Jurisdiction'}
                              </strong>
                            </>
                          ) : (
                            'Application registered and queued for nearest officer assignment based on your geocoded premises.'
                          )}
                        </p>
                      </div>
                      <div className="mt-2 mt-md-0">
                        <span className="badge bg-success-subtle text-success border border-success px-3 py-2">
                          <i className="bi bi-check-all me-1"></i> Status: {submissionResult.application?.allocationStatus || 'ALLOCATED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Full Receipt Component Preview */}
                  <div className="gov-card p-4 p-md-5 mb-4">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                      <h5 className="fw-bold text-navy mb-0">
                        <i className="bi bi-receipt-cutoff text-primary me-2"></i>
                        Official Statutory Fee Payment Receipt
                      </h5>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => window.print()}
                        >
                          <i className="bi bi-printer me-1"></i> Print
                        </button>
                        <a
                          href={getFileDownloadUrl(`/api/payments/${submissionResult.payment?._id || submissionResult.payment?.receiptNumber}/receipt/download`)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success btn-sm"
                        >
                          <i className="bi bi-download me-1"></i> Download PDF
                        </a>
                      </div>
                    </div>

                    {/* Receipt Details Box */}
                    <div className="p-4 bg-light rounded border">
                      {/* Gov Heading */}
                      <div className="text-center border-bottom pb-3 mb-3">
                        <div className="small text-muted font-monospace">LEGAL METROLOGY DIVISION — E-PAYMENT RECEIPT</div>
                        <h5 className="fw-bold text-navy mb-0">GOVERNMENT OF INDIA / STATE LEGAL METROLOGY</h5>
                        <div className="text-muted small">Department of Consumer Affairs, Food & Public Distribution</div>
                      </div>

                      {/* Identifiers Grid */}
                      <div className="row g-3 small mb-3">
                        <div className="col-md-3 col-6">
                          <span className="text-muted d-block">Receipt Number:</span>
                          <strong className="text-navy font-monospace fs-6">
                            {submissionResult.payment?.receiptNumber}
                          </strong>
                        </div>
                        <div className="col-md-3 col-6">
                          <span className="text-muted d-block">Transaction ID:</span>
                          <strong className="font-monospace text-dark">
                            {submissionResult.payment?.transactionId}
                          </strong>
                        </div>
                        <div className="col-md-3 col-6">
                          <span className="text-muted d-block">Application Ref:</span>
                          <strong className="text-primary font-monospace">
                            {submissionResult.application?.applicationNumber}
                          </strong>
                        </div>
                        <div className="col-md-3 col-6">
                          <span className="text-muted d-block">Payment Status:</span>
                          <span className="badge bg-success">PAID & VERIFIED</span>
                        </div>
                      </div>

                      {/* Machine Details */}
                      <div className="bg-white p-3 rounded border mb-3 small">
                        <h6 className="fw-bold text-navy border-bottom pb-1 mb-2">Machine Fee Assessment Basis</h6>
                        <div className="row g-2">
                          <div className="col-md-3 col-6 text-muted">Instrument Category:</div>
                          <div className="col-md-3 col-6 fw-semibold">{selectedInstrument?.instrumentType}</div>

                          <div className="col-md-3 col-6 text-muted">Brand / Model:</div>
                          <div className="col-md-3 col-6">{selectedInstrument?.manufacturer} — {selectedInstrument?.model}</div>

                          <div className="col-md-3 col-6 text-muted">Stamped Serial Number:</div>
                          <div className="col-md-3 col-6 font-monospace text-primary fw-bold">{selectedInstrument?.serialNumber}</div>

                          <div className="col-md-3 col-6 text-muted">Rated Capacity:</div>
                          <div className="col-md-3 col-6">{selectedInstrument?.capacity} {selectedInstrument?.unit}</div>
                        </div>
                      </div>

                      {/* Fee Table */}
                      <div className="table-responsive bg-white rounded border mb-3">
                        <table className="table table-sm table-hover mb-0 small align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Description</th>
                              <th>Basis</th>
                              <th className="text-end">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Statutory Verification Fee</td>
                              <td>{selectedInstrument?.instrumentType} schedule</td>
                              <td className="text-end">₹ {feeEstimate?.statutoryFee?.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td>Metrological Testing & Inspection Surcharge</td>
                              <td>Class M/F Reference Standard Weight Handling</td>
                              <td className="text-end">₹ {feeEstimate?.inspectionFee?.toFixed(2)}</td>
                            </tr>
                            <tr className="table-light fw-bold">
                              <td colSpan="2" className="text-end">Subtotal:</td>
                              <td className="text-end">₹ {feeEstimate?.subtotal?.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan="2" className="text-end text-muted">Central GST (CGST @ 9%):</td>
                              <td className="text-end text-muted">₹ {feeEstimate?.cgst?.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan="2" className="text-end text-muted">State GST (SGST @ 9%):</td>
                              <td className="text-end text-muted">₹ {feeEstimate?.sgst?.toFixed(2)}</td>
                            </tr>
                            <tr className="table-success fw-bold fs-6">
                              <td colSpan="2" className="text-end text-navy">TOTAL PAID:</td>
                              <td className="text-end text-navy font-monospace">₹ {feeEstimate?.totalAmount?.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="d-flex justify-content-between align-items-center small text-muted">
                        <div>
                          <i className="bi bi-shield-check text-success me-1"></i>
                          Statutory electronic receipt acknowledged under Legal Metrology Rules, 2011.
                        </div>
                        <div>
                          Paid via <strong>{formData.paymentMethod}</strong> on {new Date().toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full Modal View */}
      {submissionResult?.payment && (
        <ReceiptModal
          show={showReceiptModal}
          onHide={() => setShowReceiptModal(false)}
          payment={{
            ...submissionResult.payment,
            application: submissionResult.application,
            instrument: selectedInstrument,
            feeBreakdown: feeEstimate,
          }}
        />
      )}
    </div>
  );
};

export default NewApplication;
