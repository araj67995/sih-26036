import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [alert, setAlert] = useState(null);

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

  useEffect(() => {
    fetchUsers();
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

  return (
    <div className="admin-users">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">User & Role Management</h3>
          <p className="text-muted small mb-0">
            Control system access for Legal Metrology Officers, Administrative Staff, and Commercial Applicants
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show py-2 px-3 small mb-3`} role="alert">
          {alert.message}
          <button type="button" className="btn-close py-2" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Filter toolbar */}
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
                      {u.role !== 'admin' && (
                        <button
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'} py-1 px-2`}
                          onClick={() => toggleStatus(u)}
                        >
                          <i className={`bi ${u.status === 'active' ? 'bi-slash-circle' : 'bi-check-circle'} me-1`}></i>
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
