import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

const DashboardLayout = () => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <div className="flex-grow-1 container-fluid px-0">
        <div className="row g-0 flex-nowrap" style={{ minHeight: 'calc(100vh - 180px)' }}>
          <div className="col-auto d-none d-md-block">
            <Sidebar />
          </div>
          <div className="col py-4 px-3 px-md-4 overflow-auto">
            <Outlet />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DashboardLayout;
