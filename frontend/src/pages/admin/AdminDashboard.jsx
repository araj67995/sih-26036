import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard');
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Error fetching admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading administrator analytics...</div>
      </div>
    );
  }

  const chartData = stats?.statusBreakdown || [];
  const allocationBreakdownData = stats?.allocationStats?.allocationBreakdown || [];
  const districtBreakdown = stats?.allocationStats?.districtBreakdown || [];

  return (
    <div className="admin-dashboard">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-navy mb-1">State Administrator Console</h3>
          <p className="text-muted small mb-0">
            Welcome, <strong>{user?.name}</strong> • Legal Metrology Central Governance & Oversight
          </p>
        </div>
        <div className="d-flex gap-2 mt-2 mt-sm-0">
          <Link to="/admin/applications" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-folder2-open me-1"></i> Allocate Officers
          </Link>
          <Link to="/admin/audit-logs" className="btn btn-gov-primary btn-sm">
            <i className="bi bi-journal-text me-1"></i> Audit Trail
          </Link>
        </div>
      </div>

      {/* Geospatial Allocation & Nearest-Officer Engine KPIs */}
      <div className="gov-card p-3 mb-4 bg-light-subtle border-primary-subtle">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-bold text-navy mb-0">
            <i className="bi bi-geo-alt-fill text-danger me-2"></i>
            Geospatial Nearest-Officer Allocation Engine Metrics
          </h6>
          <span className="badge bg-primary font-monospace">MongoDB $geoNear Active</span>
        </div>
        <div className="row g-3">
          <div className="col-lg-3 col-sm-6">
            <div className="p-3 bg-white rounded border border-success-subtle shadow-sm">
              <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                Auto-Allocated (Nearest)
              </small>
              <div className="d-flex align-items-baseline justify-content-between mt-1">
                <h3 className="fw-bold text-success mb-0">{stats?.allocationStats?.autoAllocated || 0}</h3>
                <span className="badge bg-success-subtle text-success">⚡ Automated</span>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-sm-6">
            <div className="p-3 bg-white rounded border border-primary-subtle shadow-sm">
              <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                Admin Manual Overrides
              </small>
              <div className="d-flex align-items-baseline justify-content-between mt-1">
                <h3 className="fw-bold text-primary mb-0">{stats?.allocationStats?.manualAllocated || 0}</h3>
                <span className="badge bg-primary-subtle text-primary">Audit Logged</span>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-sm-6">
            <div className="p-3 bg-white rounded border border-warning-subtle shadow-sm">
              <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                Awaiting Officer Pickup
              </small>
              <div className="d-flex align-items-baseline justify-content-between mt-1">
                <h3 className="fw-bold text-warning mb-0">{stats?.allocationStats?.waitingAllocation || 0}</h3>
                <span className="badge bg-warning-subtle text-warning">In Queue</span>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-sm-6">
            <div className="p-3 bg-white rounded border border-info-subtle shadow-sm">
              <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                Avg Allocation Distance
              </small>
              <div className="d-flex align-items-baseline justify-content-between mt-1">
                <h3 className="fw-bold text-navy mb-0">
                  {stats?.allocationStats?.avgAllocationDistanceFormatted || '0 km'}
                </h3>
                <span className="badge bg-info-subtle text-info">Spatial Radius</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-primary">
            <small className="text-muted text-uppercase fw-semibold">Total Applicants</small>
            <h3 className="fw-bold text-navy mt-1 mb-0">{stats?.totalApplicants || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-info">
            <small className="text-muted text-uppercase fw-semibold">Inspectors (Officers)</small>
            <h3 className="fw-bold text-info mt-1 mb-0">{stats?.totalOfficers || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-secondary">
            <small className="text-muted text-uppercase fw-semibold">Total Applications</small>
            <h3 className="fw-bold text-dark mt-1 mb-0">{stats?.totalApplications || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-warning">
            <small className="text-muted text-uppercase fw-semibold">Pending Verification</small>
            <h3 className="fw-bold text-warning mt-1 mb-0">{stats?.pendingApplications || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-success">
            <small className="text-muted text-uppercase fw-semibold">Approved Applications</small>
            <h3 className="fw-bold text-success mt-1 mb-0">{stats?.approvedApplications || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-danger">
            <small className="text-muted text-uppercase fw-semibold">Rejected Applications</small>
            <h3 className="fw-bold text-danger mt-1 mb-0">{stats?.rejectedApplications || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-primary">
            <small className="text-muted text-uppercase fw-semibold">Certificates Issued</small>
            <h3 className="fw-bold text-primary mt-1 mb-0">{stats?.certificatesIssued || 0}</h3>
          </div>
        </div>

        <div className="col-lg-3 col-sm-6">
          <div className="gov-card p-3 border-start border-4 border-warning">
            <small className="text-muted text-uppercase fw-semibold">Expiring in 30 Days</small>
            <h3 className="fw-bold text-warning mt-1 mb-0">{stats?.expiringCertificates || 0}</h3>
          </div>
        </div>
      </div>

      {/* Visual Analytics with Recharts */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3">Verification Volume by Pipeline Status</h5>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#1565c0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="gov-card p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <h5 className="fw-bold text-navy mb-3">Governance Quick Actions</h5>
              <div className="d-flex flex-column gap-2 mb-4">
                <Link to="/admin/users" className="btn btn-outline-primary text-start p-2">
                  <i className="bi bi-people me-2"></i>
                  <strong>Manage Users</strong>
                  <div className="small text-muted">Activate / Suspend officer & applicant accounts</div>
                </Link>

                <Link to="/admin/applications" className="btn btn-outline-primary text-start p-2">
                  <i className="bi bi-person-check me-2"></i>
                  <strong>Officer Workload Reassignment</strong>
                  <div className="small text-muted">Assign applications to field inspectors</div>
                </Link>

                <Link to="/admin/test-centres" className="btn btn-outline-primary text-start p-2">
                  <i className="bi bi-geo-alt me-2"></i>
                  <strong>Accredited Test Centres</strong>
                  <div className="small text-muted">Manage departmental calibration laboratories</div>
                </Link>

                <Link to="/admin/audit-logs" className="btn btn-outline-primary text-start p-2">
                  <i className="bi bi-journal-text me-2"></i>
                  <strong>Inspect Audit Trail</strong>
                  <div className="small text-muted">Review tamper-proof action logs & timestamps</div>
                </Link>
              </div>
            </div>

            <div className="p-3 bg-light rounded text-center small border">
              <i className="bi bi-shield-lock-fill text-success fs-5 d-block mb-1"></i>
              System Operating Normally on <strong>MongoDB</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Geospatial Distribution & Efficiency Analytics */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3">
              <i className="bi bi-pie-chart-fill text-primary me-2"></i>
              Allocation Engine Method Breakdown
            </h5>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={allocationBreakdownData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {allocationBreakdownData.map((entry, index) => (
                      <Cell key={`alloc-cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <small className="text-muted text-center d-block">
              Ratio of automated nearest-officer matches vs administrative manual overrides
            </small>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="gov-card p-4 h-100">
            <h5 className="fw-bold text-navy mb-3">
              <i className="bi bi-geo-fill text-danger me-2"></i>
              Top Districts by Verification Volume
            </h5>
            {districtBreakdown.length === 0 ? (
              <div className="text-muted text-center py-4 small">No district volume data recorded yet</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {districtBreakdown.slice(0, 5).map((d, i) => (
                  <div key={i} className="border-bottom pb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold text-navy small">
                        <i className="bi bi-building me-1 text-muted"></i>
                        {d.district}
                      </span>
                      <span className="badge bg-primary-subtle text-primary font-monospace">
                        {d.count} Applications
                      </span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{
                          width: `${Math.min(100, Math.round((d.count / (stats?.totalApplications || 1)) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
