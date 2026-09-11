import React from 'react';
import { getFileDownloadUrl } from '../services/api';

const ReceiptModal = ({ show, onHide, payment }) => {
  if (!show || !payment) return null;

  const {
    receiptNumber,
    transactionId,
    application,
    instrument,
    business,
    applicant,
    applicationType,
    feeBreakdown,
    paymentMethod = 'UPI',
    paidAt,
    _id,
  } = payment;

  const appNumber = application?.applicationNumber || (typeof application === 'string' ? application : 'APP-REF');
  const bName = business?.businessName || 'Commercial Establishment';
  const bAddress = business?.address
    ? `${business.address}, ${business.district || ''}, ${business.state || ''} - ${business.pincode || ''}`
    : 'Registered Premises';
  const gst = business?.gstNumber || 'N/A';
  const pName = applicant?.name || 'Applicant';
  const pPhone = applicant?.phone || '';

  const instType = instrument?.instrumentType || 'Measuring Instrument';
  const instModel = instrument?.model || '-';
  const instMfg = instrument?.manufacturer || '-';
  const instSerial = instrument?.serialNumber || '-';
  const instCap = `${instrument?.capacity || 0} ${instrument?.unit || 'kg'}`;
  const instLoc = instrument?.location || 'Premises';

  const statutoryFee = feeBreakdown?.statutoryFee || 0;
  const inspectionFee = feeBreakdown?.inspectionFee || 0;
  const subtotal = feeBreakdown?.subtotal || (statutoryFee + inspectionFee);
  const cgst = feeBreakdown?.cgst || Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = feeBreakdown?.sgst || Math.round(subtotal * 0.09 * 100) / 100;
  const totalAmount = feeBreakdown?.totalAmount || Math.round(subtotal + cgst + sgst);
  const words = feeBreakdown?.amountInWords || `Rupees ${totalAmount} Only`;

  const downloadUrl = getFileDownloadUrl(`/api/payments/${_id || receiptNumber}/receipt/download`);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          {/* Modal Header */}
          <div className="modal-header bg-navy text-white py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-receipt-cutoff fs-4 text-warning"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0">Legal Metrology Fee Payment Receipt</h5>
                <small className="text-light opacity-75">Statutory Verification e-Receipt</small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body - Styled as Official Gov Receipt */}
          <div className="modal-body p-4 bg-light" id="printable-receipt">
            <div className="bg-white p-4 rounded border shadow-sm" style={{ borderTop: '4px solid #0b3b60' }}>
              {/* Header */}
              <div className="text-center border-bottom pb-3 mb-3">
                <div className="badge bg-primary-subtle text-primary fw-bold px-3 py-1 mb-2 text-uppercase font-monospace">
                  Smart India Hackathon 2026 (Problem Statement ID: 26036)
                </div>
                <h5 className="fw-bold text-navy mb-0">GOVERNMENT OF INDIA / STATE LEGAL METROLOGY</h5>
                <div className="fw-semibold text-dark small">Department of Consumer Affairs, Food & Public Distribution</div>
                <div className="text-muted small">Weights & Measures Division — Central e-Treasury Receipt</div>
                <h6 className="fw-bold text-success mt-2 mb-0">
                  <i className="bi bi-patch-check-fill me-1"></i> STATUTORY VERIFICATION & STAMPING FEE RECEIPT
                </h6>
              </div>

              {/* Receipt Summary Banner */}
              <div className="row g-2 p-3 bg-light rounded border mb-3 small">
                <div className="col-sm-6">
                  <div className="text-muted">Receipt Number:</div>
                  <strong className="text-navy font-monospace fs-6">{receiptNumber}</strong>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted">Payment Status:</div>
                  <span className="badge bg-success px-2 py-1">
                    <i className="bi bi-check-circle-fill me-1"></i> COMPLETED (PAID)
                  </span>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted">Application Number:</div>
                  <span className="fw-bold text-primary font-monospace">{appNumber}</span>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted">Transaction ID:</div>
                  <span className="font-monospace text-dark">{transactionId}</span>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted">Payment Date & Time:</div>
                  <div>{new Date(paidAt || Date.now()).toLocaleString('en-IN')}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted">Payment Mode / Gateway:</div>
                  <div>{paymentMethod} • BharatKosh e-Portal</div>
                </div>
              </div>

              {/* 1. Establishment / Payer Particulars */}
              <div className="mb-3">
                <h6 className="fw-bold text-navy border-bottom pb-1 small text-uppercase">
                  1. Payer & Establishment Particulars
                </h6>
                <div className="row g-2 small">
                  <div className="col-4 text-muted">Establishment Name:</div>
                  <div className="col-8 fw-semibold">{bName}</div>

                  <div className="col-4 text-muted">Authorized Applicant:</div>
                  <div className="col-8">{pName} {pPhone ? `(${pPhone})` : ''}</div>

                  <div className="col-4 text-muted">Premises Address:</div>
                  <div className="col-8">{bAddress}</div>

                  <div className="col-4 text-muted">GSTIN / Tax ID:</div>
                  <div className="col-8 font-monospace">{gst}</div>
                </div>
              </div>

              {/* 2. Machine / Instrument Details */}
              <div className="mb-3">
                <h6 className="fw-bold text-navy border-bottom pb-1 small text-uppercase">
                  2. Machine / Instrument Details (Fee Assessment Basis)
                </h6>
                <div className="row g-2 small">
                  <div className="col-4 text-muted">Instrument Category:</div>
                  <div className="col-8 fw-semibold text-primary">{instType}</div>

                  <div className="col-4 text-muted">Brand & Model:</div>
                  <div className="col-8">{instMfg} — {instModel}</div>

                  <div className="col-4 text-muted">Stamped Serial No:</div>
                  <div className="col-8 font-monospace fw-bold text-navy">{instSerial}</div>

                  <div className="col-4 text-muted">Rated Capacity:</div>
                  <div className="col-8">{instCap}</div>

                  <div className="col-4 text-muted">Premise Spot / Location:</div>
                  <div className="col-8">{instLoc}</div>

                  <div className="col-4 text-muted">Verification Type:</div>
                  <div className="col-8"><span className="badge bg-light text-dark border">{applicationType || 'INITIAL'}</span></div>
                </div>
              </div>

              {/* 3. Statutory Fee Computation Table */}
              <div className="mb-3">
                <h6 className="fw-bold text-navy border-bottom pb-1 small text-uppercase">
                  3. Statutory Fee Computation & Tax Invoice
                </h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered align-middle mb-2 small">
                    <thead className="table-light text-navy">
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Statutory Fee Description</th>
                        <th>Assessment Basis</th>
                        <th className="text-end" style={{ width: '120px' }}>Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>
                          <strong>Statutory Verification & Stamping Fee</strong>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Calculated for {instType} ({instCap}) under Schedule IX
                          </div>
                        </td>
                        <td>Category Base Rate</td>
                        <td className="text-end fw-semibold">₹ {statutoryFee.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>
                          <strong>Metrological Physical Inspection & Testing Charge</strong>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Reference standard weight calibration surcharge
                          </div>
                        </td>
                        <td>Statutory Surcharge</td>
                        <td className="text-end fw-semibold">₹ {inspectionFee.toFixed(2)}</td>
                      </tr>
                      <tr className="table-light">
                        <td colSpan="3" className="text-end fw-bold text-navy">Subtotal (Assessable Metrological Fee):</td>
                        <td className="text-end fw-bold text-navy">₹ {subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-end text-muted">Central GST (CGST @ 9.0%):</td>
                        <td className="text-end">₹ {cgst.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-end text-muted">State GST (SGST @ 9.0%):</td>
                        <td className="text-end">₹ {sgst.toFixed(2)}</td>
                      </tr>
                      <tr className="table-primary border-primary">
                        <td colSpan="3" className="text-end fw-bold text-navy fs-6">
                          TOTAL STATUTORY AMOUNT PAID:
                        </td>
                        <td className="text-end fw-bold text-navy fs-6">
                          ₹ {totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2 bg-light rounded border small mb-2">
                  <span className="text-muted">Amount in Words: </span>
                  <strong className="text-navy">{words}</strong>
                </div>
              </div>

              {/* Authentication & Disclaimer Notice */}
              <div className="d-flex align-items-center justify-content-between pt-2 border-top small text-muted">
                <div>
                  <i className="bi bi-shield-lock-fill text-success me-1"></i>
                  <span>Electronically Verified & Settled via BharatKosh Gateway</span>
                </div>
                <div className="font-monospace" style={{ fontSize: '0.75rem' }}>
                  REF: {receiptNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-white d-flex justify-content-between">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onHide}>
              Close
            </button>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-dark btn-sm" onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i> Print Receipt
              </button>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-sm fw-bold"
              >
                <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF Receipt
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
