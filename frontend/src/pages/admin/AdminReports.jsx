import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../services/api';

const COLORS = ['#1565c0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/reports');
        if (res.success) {
          setReports(res.data);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Aggregating district verification data...</div>
      </div>
    );
  }

  const districtData = reports?.districtStats || [];
  const categoryData = reports?.categoryStats?.map((c) => ({
    name: c._id || 'Other',
    value: c.count,
  })) || [];

  return (
    <div className="admin-reports">
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">District Compliance Reports & Metrological Analytics</h3>
        <p className="text-muted small mb-0">
          Aggregated distribution of commercial verification applications, approvals, and category market density
        </p>
      </div>

      <div className="row g-4 mb-4">
        {/* District Verification Volume */}
        <div className="col-lg-7">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3">Applications by District</h5>
            {districtData.length === 0 ? (
              <p className="text-muted small">No district metrics available yet.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={districtData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" name="Approved" fill="#10b981" stackId="a" />
                    <Bar dataKey="pending" name="Pending" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Instrument Categories Distribution */}
        <div className="col-lg-5">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3">Instrument Types Share</h5>
            {categoryData.length === 0 ? (
              <p className="text-muted small">No instrument data available.</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* District Breakdown Table */}
      <div className="gov-card p-4">
        <h5 className="fw-bold text-navy mb-3">Detailed District Compliance Summary</h5>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>District</th>
                <th>Total Applications</th>
                <th>Approved & Stamped</th>
                <th>Pending Scrutiny</th>
                <th>Rejected</th>
                <th>Compliance Rate</th>
              </tr>
            </thead>
            <tbody>
              {districtData.map((d) => {
                const rate = d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0;
                return (
                  <tr key={d._id}>
                    <td className="fw-bold text-navy">{d._id}</td>
                    <td>{d.total}</td>
                    <td className="text-success fw-bold">{d.approved}</td>
                    <td className="text-warning fw-bold">{d.pending}</td>
                    <td className="text-danger fw-bold">{d.rejected}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '8px' }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{ width: `${rate}%` }}
                            aria-valuenow={rate}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <span className="small fw-bold">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
