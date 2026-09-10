import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/audit-logs');
        if (res.success) {
          setLogs(res.data);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="admin-audit-logs">
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">Immutable Departmental Audit Trail</h3>
        <p className="text-muted small mb-0">
          Tamper-evident chronological ledger of all verification actions, inspections, state transitions, and certificate operations
        </p>
      </div>

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="ms-2 text-muted small">Loading audit ledger from MongoDB...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-journal-x display-5 d-block mb-2"></i>
            No audit records registered yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 font-monospace small">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Status Transition</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-muted text-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <strong className="text-navy">{log.user.name}</strong>
                          <span className="d-block text-muted" style={{ fontSize: '0.7rem' }}>
                            {log.user.role?.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="badge bg-light text-dark border">PUBLIC / SYSTEM</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-primary-subtle text-primary border">{log.action}</span>
                    </td>
                    <td>
                      <span className="fw-semibold">{log.entityType}</span>
                    </td>
                    <td className="text-nowrap">
                      {log.previousStatus && log.newStatus ? (
                        <span>
                          <span className="text-muted">{log.previousStatus}</span> &rarr;{' '}
                          <span className="fw-bold text-success">{log.newStatus}</span>
                        </span>
                      ) : log.newStatus ? (
                        <span className="fw-bold text-success">{log.newStatus}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="small text-wrap" style={{ maxWidth: '350px' }}>
                      {log.description}
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

export default AdminAuditLogs;
