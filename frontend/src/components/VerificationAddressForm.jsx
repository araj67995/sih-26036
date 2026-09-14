import React, { useState } from 'react';
import api from '../services/api';
import LocationPickerMap from './LocationPickerMap';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Andaman and Nicobar Islands',
  'Lakshadweep',
];

const VerificationAddressForm = ({
  address = {},
  onChange,
  onLocationConfirmed,
  isConfirmed = false,
  title = 'Verification Location',
  description = 'Physical premises where instruments are installed and verified by Legal Metrology inspectors',
  showMapInitial = false,
}) => {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showMap, setShowMap] = useState(showMapInitial || Boolean(address.latitude && address.longitude));

  const handleChange = (e) => {
    const { name, value } = e.target;
    // When address fields change, reset confirmation status so user re-locates/confirms
    onChange({
      ...address,
      [name]: value,
      isLocationConfirmed: false,
    });
  };

  const validatePincode = (pin) => {
    return /^[1-9][0-9]{5}$/.test(pin);
  };

  const handleLocateAddress = async () => {
    setError('');
    setSuccessMsg('');

    // Field validations
    if (!address.addressLine1?.trim()) {
      setError('Please provide Address Line 1');
      return;
    }
    if (!address.locality?.trim()) {
      setError('Please provide Village / Locality');
      return;
    }
    if (!address.city?.trim()) {
      setError('Please provide City');
      return;
    }
    if (!address.district?.trim()) {
      setError('Please provide District');
      return;
    }
    if (!address.state?.trim()) {
      setError('Please provide State');
      return;
    }
    if (!address.pincode?.trim() || !validatePincode(address.pincode.trim())) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 110001)');
      return;
    }

    setLocating(true);

    try {
      const res = await api.post('/geocoding/geocode', {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        locality: address.locality,
        landmark: address.landmark,
        city: address.city,
        district: address.district,
        state: address.state,
        country: address.country || 'India',
        pincode: address.pincode,
      });

      if (res.success && res.data) {
        const { latitude, longitude, formattedAddress } = res.data;
        const updated = {
          ...address,
          latitude,
          longitude,
          formattedAddress,
          isLocationConfirmed: true, // auto-verified via backend geocode
        };
        onChange(updated);
        setShowMap(true);
        setSuccessMsg('Address geocoded and located successfully on map!');

        if (onLocationConfirmed) {
          onLocationConfirmed(latitude, longitude, updated);
        }
      } else {
        setError(res.message || 'Could not locate address coordinates');
      }
    } catch (err) {
      setError(err.message || 'Geocoding failed. Please verify district and PIN code.');
    } finally {
      setLocating(false);
    }
  };

  const handleMarkerMoved = (lat, lng) => {
    const updated = {
      ...address,
      latitude: lat,
      longitude: lng,
      isLocationConfirmed: false,
    };
    onChange(updated);
    setSuccessMsg('Marker moved. Click "Confirm Location" on map to lock coordinates.');
  };

  const handleMapConfirmed = (lat, lng) => {
    const updated = {
      ...address,
      latitude: lat,
      longitude: lng,
      isLocationConfirmed: true,
    };
    onChange(updated);
    setSuccessMsg('Location coordinates successfully confirmed!');

    if (onLocationConfirmed) {
      onLocationConfirmed(lat, lng, updated);
    }
  };

  const fullAddressString = [
    address.addressLine1,
    address.addressLine2,
    address.locality,
    address.landmark ? `Near ${address.landmark}` : '',
    address.city,
    address.district,
    address.state,
    address.pincode,
    address.country || 'India',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="verification-address-section border rounded p-4 bg-light-subtle mb-4">
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
        <div>
          <h5 className="fw-bold text-navy mb-0">
            <i className="bi bi-geo-alt-fill text-danger me-2"></i>
            {title}
          </h5>
          <small className="text-muted">{description}</small>
        </div>

        {/* Location Status Indicator */}
        <div className="text-end">
          {isConfirmed || address.isLocationConfirmed ? (
            <span className="badge bg-success-subtle text-success border border-success fw-semibold px-2 py-1">
              <i className="bi bi-check-circle-fill me-1"></i> ✓ Address verified
            </span>
          ) : (
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning fw-semibold px-2 py-1">
              <i className="bi bi-exclamation-triangle-fill me-1"></i> Verification Pending
            </span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 px-3 small mb-3">{successMsg}</div>}

      <div className="row g-3">
        {/* Address Line 1 */}
        <div className="col-12">
          <label className="form-label small fw-semibold">
            Address Line 1 (Premises / Shop / Building / Plot No.) <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="addressLine1"
            className="form-control"
            placeholder="e.g. Shop No. 14, Ground Floor, Central Market"
            value={address.addressLine1 || ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* Address Line 2 */}
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Address Line 2 (Street / Sector / Area)</label>
          <input
            type="text"
            name="addressLine2"
            className="form-control"
            placeholder="e.g. Near Clock Tower, Sector 3"
            value={address.addressLine2 || ''}
            onChange={handleChange}
          />
        </div>

        {/* Village / Locality */}
        <div className="col-md-6">
          <label className="form-label small fw-semibold">
            Village / Locality <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="locality"
            className="form-control"
            placeholder="e.g. Chandni Chowk / Kankarbagh"
            value={address.locality || ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* Landmark */}
        <div className="col-md-6">
          <label className="form-label small fw-semibold">Landmark</label>
          <input
            type="text"
            name="landmark"
            className="form-control"
            placeholder="e.g. Opposite State Bank of India"
            value={address.landmark || ''}
            onChange={handleChange}
          />
        </div>

        {/* City */}
        <div className="col-md-6">
          <label className="form-label small fw-semibold">
            City / Town <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="city"
            className="form-control"
            placeholder="e.g. New Delhi / Patna"
            value={address.city || ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* District */}
        <div className="col-md-4">
          <label className="form-label small fw-semibold">
            District <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="district"
            className="form-control"
            placeholder="e.g. Central Delhi / Patna"
            value={address.district || ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* State */}
        <div className="col-md-4">
          <label className="form-label small fw-semibold">
            State / UT <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="state"
            list="stateList"
            className="form-control"
            placeholder="e.g. Delhi / Bihar"
            value={address.state || ''}
            onChange={handleChange}
            required
          />
          <datalist id="stateList">
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* PIN Code */}
        <div className="col-md-2 col-6">
          <label className="form-label small fw-semibold">
            PIN Code <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="pincode"
            className={`form-control ${
              address.pincode && !validatePincode(address.pincode) ? 'is-invalid' : ''
            }`}
            placeholder="110001"
            value={address.pincode || ''}
            onChange={handleChange}
            maxLength="6"
            required
          />
          <div className="invalid-feedback small">Must be 6 digits</div>
        </div>

        {/* Country */}
        <div className="col-md-2 col-6">
          <label className="form-label small fw-semibold">
            Country <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="country"
            className="form-control"
            value={address.country || 'India'}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Action Button: Locate Address */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 pt-3 border-top gap-2">
        <button
          type="button"
          className="btn btn-outline-primary fw-bold"
          onClick={handleLocateAddress}
          disabled={locating}
        >
          {locating ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Geocoding Address...
            </>
          ) : (
            <>
              <i className="bi bi-crosshair me-1"></i> Locate Address
            </>
          )}
        </button>

        <div className="text-muted small">
          {address.latitude && address.longitude ? (
            <span className="font-monospace text-dark">
              Coordinates: <strong>{Number(address.latitude).toFixed(6)}</strong>,{' '}
              <strong>{Number(address.longitude).toFixed(6)}</strong>
            </span>
          ) : (
            <span>Click "Locate Address" to detect coordinates via backend geocoder</span>
          )}
        </div>
      </div>

      {/* Map Preview */}
      {showMap && address.latitude && address.longitude && (
        <div className="mt-4">
          <h6 className="fw-bold text-navy mb-2">
            <i className="bi bi-map-fill text-primary me-2"></i>
            Geocoded Location Preview & Marker Adjustment
          </h6>
          <LocationPickerMap
            latitude={address.latitude}
            longitude={address.longitude}
            onLocationChange={handleMarkerMoved}
            onConfirmLocation={handleMapConfirmed}
            isConfirmed={isConfirmed || address.isLocationConfirmed}
            label={title}
            addressPreview={fullAddressString}
          />
        </div>
      )}
    </div>
  );
};

export default VerificationAddressForm;
