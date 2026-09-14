import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LocationPickerMap from '../../components/LocationPickerMap';

const AdminUsers = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'officers'
  const [users, setUsers] = useState([]);
  const [officerProfiles, setOfficerProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [alert, setAlert] = useState(null);

  // Edit Officer Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [locationForm, setLocationForm] = useState({
    officeName: '',
    officeAddress: '',
    district: '',
    state: 'Delhi',
    pincode: '',
    serviceRadius: 50,
    availabilityStatus: 'AVAILABLE',
    latitude: null,
    longitude: null,
  });
  const [geocoding, setGeocoding] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = roleFilter ? `/admin/users?role=${roleFilter}` : '/admin/users';
      const res = await api.get(url);
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficerProfiles = async () => {
    try {
      setLoadingOfficers(true);
      const res = await api.get('/officers');
      if (res.success) {
        setOfficerProfiles(res.data);
      }
    } catch (err) {
      console.warn('Error fetching officer profiles:', err);
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOfficerProfiles();
  }, [roleFilter]);

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.put(`/admin/users/${user._id}/status`, { status: newStatus });
      if (res.success) {
        setAlert({ type: 'success', message: `User ${user.name} status updated to ${newStatus}` });
        fetchUsers();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Error updating status' });
    }
  };

  const openEditLocation = (officer) => {
    const coords = officer.location?.coordinates || [];
    setEditingOfficer(officer);
    setLocationForm({
      officeName: officer.officeName || '',
      officeAddress: officer.officeAddress || '',
      district: officer.district || '',
      state: officer.state || 'Delhi',
      pincode: officer.pincode || '',
      serviceRadius: officer.serviceRadius || 50,
      availabilityStatus: officer.availabilityStatus || 'AVAILABLE',
      latitude: coords.length === 2 ? coords[1] : null,
      longitude: coords.length === 2 ? coords[0] : null,
    });
    setShowLocationModal(true);
  };

  const handleGeocodeOffice = async () => {
    if (!locationForm.district || !locationForm.state) {
      setAlert({ type: 'warning', message: 'Please specify district and state before geocoding.' });
      return;
    }

    try {
      setGeocoding(true);
      const res = await api.post('/geocoding/geocode', {
        addressLine1: locationForm.officeAddress,
        city: locationForm.district,
        district: locationForm.district,
        state: locationForm.state,
        pincode: locationForm.pincode,
        country: 'India',
      });

      if (res.success && res.data) {
        setLocationForm((prev) => ({
          ...prev,
          latitude: res.data.latitude,
          longitude: res.data.longitude,
        }));
        setAlert({ type: 'success', message: 'Office coordinates geocoded successfully!' });
      } else {
        setAlert({ type: 'danger', message: res.message || 'Could not locate address' });
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Geocoding failed' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!editingOfficer) return;

    try {
      setSavingLocation(true);
      const targetId = editingOfficer._id || editingOfficer.user?._id;
      const payload = {
        officeName: locationForm.officeName,
        officeAddress: locationForm.officeAddress,
        district: locationForm.district,
        state: locationForm.state,
        pincode: locationForm.pincode,
        serviceRadius: Number(locationForm.serviceRadius) || 50,
        availabilityStatus: locationForm.availabilityStatus,
      };

      if (locationForm.latitude != null && locationForm.longitude != null) {
        payload.coordinates = [Number(locationForm.longitude), Number(locationForm.latitude)];
      }

      const res = await api.put(`/officers/${targetId}/location`, payload);
      if (res.success) {
        setShowLocationModal(false);
        setAlert({ type: 'success', message: `Officer office location updated successfully!` });
        fetchOfficerProfiles();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to update office location' });
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="admin-users">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">User Directory & Officer Jurisdictions</h3>
          <p className="text-muted small mb-0">
            Control access and manage Legal Metrology Officer office locations, service radii, and availability
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show py-2 px-3 small mb-3`} role="alert">
          {alert.message}
          <button type="button" className="btn-close py-2" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'users' ? 'active text-primary' : 'text-muted'}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="bi bi-people me-1"></i> User Accounts Directory
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'officers' ? 'active text-primary' : 'text-muted'}`}
            onClick={() => {
              setActiveTab('officers');
              fetchOfficerProfiles();
            }}
          >
            <i className="bi bi-geo-alt-fill text-danger me-1"></i> Officer Office Locations & Radii ({officerProfiles.length})
          </button>
        </li>
      </ul>

      {/* TAB 1: USER ACCOUNTS DIRECTORY */}
      {activeTab === 'users' && (
        <>
          <div className="bg-white p-3 rounded border mb-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted fw-bold">Filter By Role:</label>
              <select
                className="form-select form-select-sm"
                style={{ width: '200px' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="applicant">Applicants / Traders</option>
                <option value="officer">Legal Metrology Officers</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
            <span className="small text-muted font-monospace">Total Users: {users.length}</span>
          </div>

          <div className="gov-card p-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary"></div>
                <span className="ms-2 text-muted small">Loading user directory from MongoDB...</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Email (Login ID)</th>
                      <th>Contact Phone</th>
                      <th>Role</th>
                      <th>Account Status</th>
                      <th>Created Date</th>
                      <th>Access Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td className="fw-bold text-navy">{u.name}</td>
                        <td>{u.email}</td>
                        <td className="font-monospace text-muted">{u.phone}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.role === 'admin'
                                ? 'bg-dark'
                                : u.role === 'officer'
                                ? 'bg-primary'
                                : 'bg-light text-dark border'
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="small text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="d-flex gap-1">
                            {u.role !== 'admin' && (
                              <button
                                className={`btn btn-sm ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} py-1 px-2`}
                                onClick={() => toggleStatus(u)}
                              >
                                <i className={`bi ${u.status === 'active' ? 'bi-slash-circle' : 'bi-check-circle'} me-1`}></i>
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}

                            {u.role === 'officer' && (
                              <button
                                className="btn btn-sm btn-outline-primary py-1 px-2"
                                onClick={() => {
                                  const profile = officerProfiles.find(
                                    (op) => op.user?._id === u._id || op.user === u._id
                                  ) || { user: u, officerName: u.name, district: 'Central Delhi', state: 'Delhi' };
                                  openEditLocation(profile);
                                }}
                                title="Configure Office Coordinates & Service Radius"
                              >
                                <i className="bi bi-geo-alt me-1"></i> Office Location
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: OFFICER LOCATIONS & JURISDICTIONS */}
      {activeTab === 'officers' && (
        <div className="gov-card p-4">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <div>
              <h5 className="fw-bold text-navy mb-0">Legal Metrology Field Officers & Departmental Offices</h5>
              <small className="text-muted">
                Each officer's 2dsphere GeoJSON location and service radius power the automated nearest-officer allocation system
              </small>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={fetchOfficerProfiles}
            >
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </button>
          </div>

          {loadingOfficers ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary me-2"></div>
              <span className="text-muted small">Loading officer locations...</span>
            </div>
          ) : officerProfiles.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-geo-alt display-6 d-block mb-2"></i>
              No officer profiles configured yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Officer Name</th>
                    <th>Departmental Office</th>
                    <th>District / State</th>
                    <th>Coordinates (GeoJSON)</th>
                    <th>Service Radius</th>
                    <th>Availability</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officerProfiles.map((off) => {
                    const coords = off.location?.coordinates || [];
                    const hasGeo = coords.length === 2 && !(coords[0] === 0 && coords[1] === 0);
                    return (
                      <tr key={off._id}>
                        <td>
                          <div className="fw-bold text-navy">{off.officerName || off.user?.name}</div>
                          <small className="text-muted">{off.user?.email}</small>
                        </td>
                        <td>
                          <div className="fw-semibold">{off.officeName || 'Legal Metrology Office'}</div>
                          <small className="text-muted">{off.officeAddress || 'Address on record'}</small>
                        </td>
                        <td>
                          <span className="fw-semibold">{off.district}</span>
                          <div className="small text-muted">{off.state} - {off.pincode}</div>
                        </td>
                        <td>
                          {hasGeo ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                              <i className="bi bi-crosshair me-1"></i>
                              {coords[1].toFixed(4)}° N, {coords[0].toFixed(4)}° E
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark">Location Pending</span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            {off.serviceRadius || 50} km
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              off.availabilityStatus === 'AVAILABLE'
                                ? 'bg-success'
                                : off.availabilityStatus === 'ON_LEAVE'
                                ? 'bg-warning text-dark'
                                : 'bg-secondary'
                            }`}
                          >
                            {off.availabilityStatus || 'AVAILABLE'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-1 px-2"
                            onClick={() => openEditLocation(off)}
                          >
                            <i className="bi bi-pencil-square me-1"></i> Edit Office
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Officer Location Modal */}
      {showLocationModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-navy">
                  <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                  Configure Officer Office & Service Jurisdiction: {editingOfficer?.officerName || editingOfficer?.user?.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowLocationModal(false)}></button>
              </div>

              <form onSubmit={handleSaveLocation}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Office Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Legal Metrology Central Delhi Zonal Office"
                        value={locationForm.officeName}
                        onChange={(e) => setLocationForm({ ...locationForm, officeName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Office Street Address *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Vikas Bhawan, IP Estate, New Delhi"
                        value={locationForm.officeAddress}
                        onChange={(e) => setLocationForm({ ...locationForm, officeAddress: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">District *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Central Delhi"
                        value={locationForm.district}
                        onChange={(e) => setLocationForm({ ...locationForm, district: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">State *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Delhi"
                        value={locationForm.state}
                        onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">PIN Code *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="110002"
                        maxLength="6"
                        value={locationForm.pincode}
                        onChange={(e) => setLocationForm({ ...locationForm, pincode: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Service Jurisdiction Radius (km) *</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="1"
                        max="500"
                        value={locationForm.serviceRadius}
                        onChange={(e) => setLocationForm({ ...locationForm, serviceRadius: e.target.value })}
                        required
                      />
                      <small className="text-muted">Applications beyond this radius will not be automatically assigned.</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Availability Status *</label>
                      <select
                        className="form-select form-select-sm"
                        value={locationForm.availabilityStatus}
                        onChange={(e) => setLocationForm({ ...locationForm, availabilityStatus: e.target.value })}
                        required
                      >
                        <option value="AVAILABLE">AVAILABLE (Receives Auto-Allocations)</option>
                        <option value="ON_LEAVE">ON_LEAVE (Temporarily Skipped)</option>
                        <option value="BUSY">BUSY (High Workload)</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  {/* Geocode button & Coordinates */}
                  <div className="mt-3 p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm fw-semibold"
                        onClick={handleGeocodeOffice}
                        disabled={geocoding}
                      >
                        {geocoding ? 'Geocoding...' : '📍 Geocode Office Address to Map'}
                      </button>
                      <span className="small text-muted font-monospace">
                        Lat: {locationForm.latitude?.toFixed(6) || '-'}, Lng: {locationForm.longitude?.toFixed(6) || '-'}
                      </span>
                    </div>

                    {locationForm.latitude && locationForm.longitude && (
                      <div className="mt-3">
                        <LocationPickerMap
                          latitude={locationForm.latitude}
                          longitude={locationForm.longitude}
                          onLocationChange={(lat, lng) =>
                            setLocationForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                          }
                          onConfirmLocation={(lat, lng) =>
                            setLocationForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                          }
                          isConfirmed={true}
                          label={locationForm.officeName || 'Department Office'}
                          addressPreview={`${locationForm.officeAddress}, ${locationForm.district}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowLocationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gov-primary btn-sm fw-bold" disabled={savingLocation}>
                    {savingLocation ? 'Saving Changes...' : 'Save Office Configuration'}
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

export default AdminUsers;

