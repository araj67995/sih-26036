import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeConfig = (s) => {
    switch (s) {
      case 'DRAFT':
        return { bg: 'secondary', text: 'Draft', icon: 'bi-pencil' };
      case 'SUBMITTED':
        return { bg: 'info text-dark', text: 'Submitted', icon: 'bi-send' };
      case 'DOCUMENT_VERIFICATION':
        return { bg: 'primary', text: 'Doc Verification', icon: 'bi-file-earmark-check' };
      case 'DOCUMENT_REJECTED':
        return { bg: 'danger', text: 'Doc Rejected', icon: 'bi-file-earmark-x' };
      case 'APPROVED_FOR_INSPECTION':
        return { bg: 'info text-dark', text: 'Approved for Inspection', icon: 'bi-clipboard-check' };
      case 'INSPECTION_SCHEDULED':
        return { bg: 'warning text-dark', text: 'Inspection Scheduled', icon: 'bi-calendar-event' };
      case 'INSPECTION_COMPLETED':
        return { bg: 'primary', text: 'Inspection Completed', icon: 'bi-clipboard2-pulse' };
      case 'APPROVED':
        return { bg: 'success', text: 'Approved', icon: 'bi-check-circle' };
      case 'REJECTED':
        return { bg: 'danger', text: 'Rejected', icon: 'bi-x-circle' };
      case 'CERTIFICATE_ISSUED':
        return { bg: 'success', text: 'Certificate Issued', icon: 'bi-patch-check-fill' };
      case 'VALID':
        return { bg: 'success', text: 'Valid', icon: 'bi-patch-check-fill' };
      case 'EXPIRED':
        return { bg: 'warning text-dark', text: 'Expired', icon: 'bi-exclamation-triangle' };
      case 'CANCELLED':
        return { bg: 'dark', text: 'Cancelled', icon: 'bi-slash-circle' };
      default:
        return { bg: 'secondary', text: s || 'Unknown', icon: 'bi-question-circle' };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span className={`badge bg-${config.bg} d-inline-flex align-items-center gap-1 px-2 py-1`}>
      <i className={`bi ${config.icon}`}></i>
      <span>{config.text}</span>
    </span>
  );
};

export default StatusBadge;
