import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);
        const res = await api.get('/certificates');
        if (res.success) {
          setCertificates(res.data);
        }
      } catch (err) {
        console.error('Error loading certificates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  return (
    <div className="applicant-certificates">
      <div className="mb-4 pb-2 border-bottom">
        <h3 className="fw-bold text-navy mb-1">Verification Certificates</h3>
        <p className="text-muted small mb-0">
          Official statutory calibration certificates issued under the Legal Metrology Act, 2009
        </p>
      </div>

      <div className="gov-card p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span className="ms-2 text-muted small">Loading certificates...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-patch-question display-5 d-block mb-3"></i>
            <h5>No Certificates Issued Yet</h5>
            <p className="small mb-3">
              Certificates appear here automatically once your instrument verification inspection is completed and approved.
            </p>
            <Link to="/applicant/applications/new" className="btn btn-gov-primary btn-sm">
              Apply for Verification
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Certificate Number</th>
                  <th>Instrument</th>
                  <th>Serial Number</th>
                  <th>Issue Date</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert._id}>
                    <td className="fw-bold text-primary font-monospace">{cert.certificateNumber}</td>
                    <td>{cert.instrument?.model || cert.instrument?.instrumentType}</td>
                    <td className="font-monospace text-muted">{cert.instrument?.serialNumber}</td>
                    <td>{new Date(cert.issueDate).toLocaleDateString()}</td>
                    <td>
                      <strong className="text-danger">{new Date(cert.validUntil).toLocaleDateString()}</strong>
                    </td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <a
                          href={`http://localhost:5000/api/certificates/${cert._id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success btn-sm py-1 px-2"
                        >
                          <i className="bi bi-download me-1"></i> PDF
                        </a>
                        <Link
                          to={`/verify/${cert.certificateNumber}`}
                          className="btn btn-outline-secondary btn-sm py-1 px-2"
                        >
                          <i className="bi bi-qr-code-scan me-1"></i> Verify
                        </Link>
                      </div>
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

export default Certificates;
