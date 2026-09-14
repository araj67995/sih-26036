import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's missing default marker icon in bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom highlighted marker icon for verification locations
const verifiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const officeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to recenter map view when coordinates change
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks for manual pin adjustment
function MapClickHandler({ onLocationChange, readOnly }) {
  useMapEvents({
    click(e) {
      if (!readOnly && onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const LocationPickerMap = ({
  latitude,
  longitude,
  onLocationChange,
  onConfirmLocation,
  isConfirmed = false,
  readOnly = false,
  label = 'Verification Location',
  markerType = 'verification', // 'verification' or 'office'
  height = '320px',
  addressPreview = '',
}) => {
  const [currentLat, setCurrentLat] = useState(latitude || 28.6139);
  const [currentLng, setCurrentLng] = useState(longitude || 77.209);
  const [confirmed, setConfirmed] = useState(isConfirmed);
  const markerRef = useRef(null);

  useEffect(() => {
    if (latitude !== undefined && latitude !== null && !isNaN(latitude)) {
      setCurrentLat(latitude);
    }
    if (longitude !== undefined && longitude !== null && !isNaN(longitude)) {
      setCurrentLng(longitude);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    setConfirmed(isConfirmed);
  }, [isConfirmed]);

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null && !readOnly) {
      const { lat, lng } = marker.getLatLng();
      setCurrentLat(lat);
      setCurrentLng(lng);
      setConfirmed(false); // require re-confirmation after moving
      if (onLocationChange) {
        onLocationChange(lat, lng);
      }
    }
  };

  const handleMapClickChange = (lat, lng) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setConfirmed(false);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    if (onConfirmLocation) {
      onConfirmLocation(currentLat, currentLng);
    }
  };

  const iconToUse = markerType === 'office' ? officeIcon : confirmed ? verifiedIcon : new L.Icon.Default();

  return (
    <div className="location-picker-map border rounded overflow-hidden shadow-sm bg-white mb-3">
      {/* Map Header Status Bar */}
      <div className="p-3 bg-light border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <i
              className={`bi ${
                markerType === 'office' ? 'bi-building text-primary' : 'bi-geo-alt-fill text-danger'
              }`}
            ></i>
            <span className="fw-bold text-navy small">{label}</span>
            {confirmed ? (
              <span className="badge bg-success small">
                <i className="bi bi-check-circle-fill me-1"></i> Location Confirmed
              </span>
            ) : !readOnly ? (
              <span className="badge bg-warning text-dark small">
                <i className="bi bi-exclamation-circle me-1"></i> Confirmation Required
              </span>
            ) : null}
          </div>
          {addressPreview && (
            <div className="text-muted small text-truncate mt-1" style={{ maxWidth: '400px' }}>
              {addressPreview}
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="font-monospace small text-secondary bg-white px-2 py-1 rounded border">
            Lat: <strong>{currentLat ? Number(currentLat).toFixed(6) : '--'}</strong> • Lng:{' '}
            <strong>{currentLng ? Number(currentLng).toFixed(6) : '--'}</strong>
          </div>

          {!readOnly && (
            <button
              type="button"
              className={`btn btn-sm ${confirmed ? 'btn-outline-success' : 'btn-success fw-bold'}`}
              onClick={handleConfirm}
              disabled={!currentLat || !currentLng}
            >
              {confirmed ? (
                <>
                  <i className="bi bi-check2 me-1"></i> Confirmed
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i> Confirm Location
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div style={{ height, width: '100%' }}>
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <ChangeView center={[currentLat, currentLng]} zoom={15} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationChange={handleMapClickChange} readOnly={readOnly} />
          <Marker
            draggable={!readOnly}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
            position={[currentLat, currentLng]}
            ref={markerRef}
            icon={iconToUse}
          >
            <Popup>
              <div className="small">
                <strong>{label}</strong>
                <br />
                {addressPreview && <div>{addressPreview}</div>}
                <div className="font-monospace mt-1">
                  {Number(currentLat).toFixed(6)}, {Number(currentLng).toFixed(6)}
                </div>
                {!readOnly && <div className="text-muted fst-italic mt-1">Drag marker to refine exact spot</div>}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Map Footer Helper */}
      {!readOnly && (
        <div className="p-2 bg-light-subtle border-top text-muted small px-3 d-flex justify-content-between">
          <span>
            <i className="bi bi-info-circle me-1"></i>
            Drag the pin or click on the map to pinpoint exact verification premises.
          </span>
          <span className="fst-italic">Click "Confirm Location" to lock coordinates.</span>
        </div>
      )}
    </div>
  );
};

export default LocationPickerMap;
