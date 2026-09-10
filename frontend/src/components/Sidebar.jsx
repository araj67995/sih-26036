import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const applicantLinks = [
    { to: '/applicant/dashboard', icon: 'bi-grid-fill', label: 'Dashboard' },
    { to: '/applicant/instruments', icon: 'bi-speedometer', label: 'My Instruments' },
    { to: '/applicant/applications', icon: 'bi-file-earmark-text-fill', label: 'Applications' },
    { to: '/applicant/applications/new', icon: 'bi-plus-circle-fill', label: 'New Application' },
    { to: '/applicant/certificates', icon: 'bi-patch-check-fill', label: 'Certificates' },
    { to: '/applicant/business', icon: 'bi-building', label: 'Business Profile' },
  ];

  const officerLinks = [
    { to: '/officer/dashboard', icon: 'bi-grid-fill', label: 'Officer Dashboard' },
    { to: '/officer/applications', icon: 'bi-clipboard-check-fill', label: 'Assigned Applications' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Admin Dashboard' },
    { to: '/admin/users', icon: 'bi-people-fill', label: 'User Management' },
    { to: '/admin/applications', icon: 'bi-folder2-open', label: 'All Applications' },
    { to: '/admin/test-centres', icon: 'bi-geo-alt-fill', label: 'Test Centres' },
    { to: '/admin/audit-logs', icon: 'bi-journal-text', label: 'Audit Trail Logs' },
    { to: '/admin/reports', icon: 'bi-bar-chart-line-fill', label: 'District Reports' },
  ];

  const links =
    role === 'admin'
      ? adminLinks
      : role === 'officer'
      ? officerLinks
      : applicantLinks;

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 bg-white border-end h-100" style={{ minWidth: '250px' }}>
      <div className="pb-3 mb-3 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <div className="rounded bg-primary text-white p-2 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
            <i className={`bi ${role === 'admin' ? 'bi-shield-shaded' : role === 'officer' ? 'bi-person-badge' : 'bi-shop'} fs-5`}></i>
          </div>
          <div>
            <h6 className="fw-bold text-navy mb-0">{user?.name}</h6>
            <span className="badge bg-primary-subtle text-primary border text-capitalize" style={{ fontSize: '0.72rem' }}>
              {role === 'officer' ? 'Legal Metrology Officer' : role}
            </span>
          </div>
        </div>
      </div>

      <ul className="nav nav-pills flex-column mb-auto gap-1">
        {links.map((link) => (
          <li key={link.to} className="nav-item">
            <NavLink
              to={link.to}
              end={link.to.endsWith('dashboard')}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 py-2 px-3 rounded ${
                  isActive ? 'active bg-primary text-white fw-semibold' : 'text-dark'
                }`
              }
            >
              <i className={`bi ${link.icon}`}></i>
              <span>{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <hr />

      <div className="dropdown">
        <button
          onClick={logout}
          className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
