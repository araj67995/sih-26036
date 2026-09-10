import React from 'react';

const TimelineTracker = ({ status, submittedAt, inspectionDate, certificateDate, remarks, rejectionReason }) => {
  const stages = [
    { key: 'SUBMITTED', title: 'Application Submitted', desc: 'Registered with instrument details', icon: 'bi-send-check' },
    { key: 'DOCUMENT_VERIFICATION', title: 'Documents Verified', desc: 'Invoices & approvals checked', icon: 'bi-file-earmark-check' },
    { key: 'INSPECTION_SCHEDULED', title: 'Inspection Scheduled', desc: 'Field inspection date confirmed', icon: 'bi-calendar-date' },
    { key: 'INSPECTION_COMPLETED', title: 'Inspection Completed', desc: 'Standard weight readings tested', icon: 'bi-speedometer2' },
    { key: 'APPROVED', title: 'Verification Approved', desc: 'Error within permissible tolerance', icon: 'bi-hand-thumbs-up' },
    { key: 'CERTIFICATE_ISSUED', title: 'Certificate Issued', desc: 'QR-enabled PDF stamped', icon: 'bi-patch-check-fill' },
  ];

  // Mapping current status to milestone index (0 to 5)
  const getStageIndex = (s) => {
    switch (s) {
      case 'DRAFT':
        return -1;
      case 'SUBMITTED':
        return 0;
      case 'DOCUMENT_VERIFICATION':
        return 1;
      case 'DOCUMENT_REJECTED':
        return 1;
      case 'APPROVED_FOR_INSPECTION':
        return 1;
      case 'INSPECTION_SCHEDULED':
        return 2;
      case 'INSPECTION_COMPLETED':
        return 3;
      case 'APPROVED':
        return 4;
      case 'REJECTED':
        return 4;
      case 'CERTIFICATE_ISSUED':
        return 5;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(status);
  const isRejected = status === 'DOCUMENT_REJECTED' || status === 'REJECTED' || status === 'CANCELLED';

  return (
    <div className="timeline-tracker p-4 bg-white rounded border">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h5 className="fw-bold mb-1 text-navy">Lifecycle Verification Progress</h5>
          <small className="text-muted">Statutory tracking timeline under Legal Metrology Rules</small>
        </div>
        <div>
          {isRejected ? (
            <span className="badge bg-danger fs-6 px-3 py-2">
              <i className="bi bi-x-octagon-fill me-1"></i> {status}
            </span>
          ) : status === 'CERTIFICATE_ISSUED' ? (
            <span className="badge bg-success fs-6 px-3 py-2">
              <i className="bi bi-patch-check-fill me-1"></i> VERIFICATION COMPLETE
            </span>
          ) : (
            <span className="badge bg-primary fs-6 px-3 py-2">
              <i className="bi bi-arrow-repeat me-1"></i> IN PROGRESS
            </span>
          )}
        </div>
      </div>

      <div className="row g-3">
        {stages.map((stage, idx) => {
          const isDone = idx < currentIndex || (idx === currentIndex && status === 'CERTIFICATE_ISSUED');
          const isCurrent = idx === currentIndex && status !== 'CERTIFICATE_ISSUED';
          const isFailedHere = isRejected && idx === currentIndex;

          return (
            <div key={stage.key} className="col-md-2 col-sm-4 col-6 text-center">
              <div
                className={`p-3 rounded h-100 border transition-all ${
                  isFailedHere
                    ? 'border-danger bg-danger-subtle text-danger'
                    : isCurrent
                    ? 'border-primary bg-primary-subtle shadow-sm'
                    : isDone
                    ? 'border-success bg-light text-success'
                    : 'border-light bg-light text-muted opacity-75'
                }`}
              >
                <div
                  className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 text-white fw-bold ${
                    isFailedHere
                      ? 'bg-danger'
                      : isDone
                      ? 'bg-success'
                      : isCurrent
                      ? 'bg-primary'
                      : 'bg-secondary'
                  }`}
                  style={{ width: '38px', height: '38px' }}
                >
                  <i className={`bi ${isDone ? 'bi-check-lg' : isFailedHere ? 'bi-x-lg' : stage.icon}`}></i>
                </div>
                <h6 className="fw-bold mb-1 small">{stage.title}</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.72rem' }}>
                  {stage.desc}
                </p>

                {/* Specific stage dates */}
                {idx === 0 && submittedAt && (
                  <div className="mt-2 text-dark font-monospace" style={{ fontSize: '0.68rem' }}>
                    {new Date(submittedAt).toLocaleDateString()}
                  </div>
                )}
                {idx === 2 && inspectionDate && (
                  <div className="mt-2 text-primary fw-bold font-monospace" style={{ fontSize: '0.68rem' }}>
                    {new Date(inspectionDate).toLocaleDateString()}
                  </div>
                )}
                {idx === 5 && certificateDate && (
                  <div className="mt-2 text-success fw-bold font-monospace" style={{ fontSize: '0.68rem' }}>
                    {new Date(certificateDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remarks or rejection alert */}
      {(remarks || rejectionReason) && (
        <div className={`mt-4 alert ${isRejected ? 'alert-danger' : 'alert-info'} mb-0 py-2 px-3 small`}>
          <strong>{isRejected ? 'Action Reason / Objection:' : 'Officer Remarks:'}</strong>{' '}
          {rejectionReason || remarks}
        </div>
      )}
    </div>
  );
};

export default TimelineTracker;
