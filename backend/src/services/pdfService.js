const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Generates an official Legal Metrology Verification Certificate PDF with embedded QR Code
 * @param {Object} data Certificate and instrument data
 * @returns {Promise<string>} Relative file path to generated PDF
 */
const generateCertificatePDF = async ({
  certificateNumber,
  businessName,
  businessAddress,
  instrumentType,
  manufacturer,
  model,
  serialNumber,
  capacity,
  unit,
  standardWeight,
  observedReading,
  error,
  issueDate,
  validUntil,
  officerName,
  verificationToken,
  clientUrl = 'http://localhost:5173',
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const certsDir = path.join(__dirname, '..', 'uploads', 'certificates');
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      const fileName = `Certificate-${certificateNumber}.pdf`;
      const filePath = path.join(certsDir, fileName);
      const relativeUrl = `/uploads/certificates/${fileName}`;

      // 1. Generate QR Code image buffer pointing to public verification page
      const verifyUrl = `${clientUrl}/verify/${certificateNumber}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 130,
        color: {
          dark: '#0b3b60',
          light: '#ffffff',
        },
      });
      const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

      // 2. Initialize PDFKit document (A4, portrait)
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Legal Metrology Certificate - ${certificateNumber}`,
          Author: 'Legal Metrology Department',
          Subject: 'Certificate of Verification of Weights & Measures',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Certificate Ornamental Border
      doc
        .lineWidth(3)
        .strokeColor('#0b3b60')
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor('#c59b27')
        .rect(26, 26, doc.page.width - 52, doc.page.height - 52)
        .stroke();

      // Top Prototype Notice
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('SMART INDIA HACKATHON PROTOTYPE (PROBLEM STATEMENT ID: 26036)', 40, 32, {
          align: 'center',
          characterSpacing: 1,
        });

      // Government Emblem / Title
      doc.moveDown(0.8);
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('GOVERNMENT OF INDIA / STATE LEGAL METROLOGY', { align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text('DEPARTMENT OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#475569')
        .text('LEGAL METROLOGY DIVISION (WEIGHTS & MEASURES ACT, 2009)', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(15)
        .font('Helvetica-Bold')
        .fillColor('#b45309')
        .text('CERTIFICATE OF INITIAL / PERIODICAL VERIFICATION', { align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#64748b')
        .text('[Issued under Section 24 of Legal Metrology Act, 2009]', { align: 'center' });

      // Horizontal Divider
      doc.moveDown(0.5);
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();

      // Certificate Number & Dates
      doc.moveDown(0.8);
      const startY = doc.y;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Certificate Number:', 50, startY)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(certificateNumber, 170, startY);

      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Date of Verification:', 350, startY)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(new Date(issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 460, startY);

      const validY = startY + 18;
      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Status:', 50, validY)
        .font('Helvetica-Bold')
        .fillColor('#166534')
        .text('VERIFIED & STAMPED (PASS)', 170, validY);

      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Valid Until:', 350, validY)
        .font('Helvetica-Bold')
        .fillColor('#b91c1c')
        .text(new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 460, validY);

      // Establishment Details Section
      doc.moveDown(2);
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('1. DETAILS OF ESTABLISHMENT / USER', 50, doc.y);

      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#334155')
        .text('Name of Business:', 60, doc.y)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(businessName, 200, doc.y);

      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fillColor('#334155')
        .text('Premises Address:', 60, doc.y)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(businessAddress || 'Official Verified Location', 200, doc.y, { width: 330 });

      // Instrument Specifications Section
      doc.moveDown(0.8);
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('2. SPECIFICATIONS OF INSTRUMENT VERIFIED', 50, doc.y);

      doc.moveDown(0.4);
      const specItems = [
        ['Instrument Category / Type:', instrumentType],
        ['Manufacturer:', manufacturer],
        ['Model Designation:', model],
        ['Serial Number (Stamped):', serialNumber],
        ['Max Verified Capacity:', `${capacity} ${unit}`],
      ];

      specItems.forEach(([label, val]) => {
        doc
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(label, 60, doc.y)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(val || '-', 240, doc.y);
        doc.moveDown(0.25);
      });

      // Inspection & Accuracy Verification
      doc.moveDown(0.6);
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('3. METROLOGICAL OBSERVATIONS & TEST RESULTS', 50, doc.y);

      doc.moveDown(0.4);
      const testItems = [
        ['Reference Standard Applied:', standardWeight ? `${standardWeight} ${unit}` : 'Standard Class F/M Weights'],
        ['Observed Instrument Reading:', observedReading ? `${observedReading} ${unit}` : 'Verified within tolerance'],
        ['Measurement Error:', error !== undefined ? `${error > 0 ? '+' : ''}${error} ${unit}` : '0.00'],
        ['Verification Verification Stamp:', 'LEGAL METROLOGY TAMPER-EVIDENT LEAD/SECURITY SEAL AFFIXED'],
      ];

      testItems.forEach(([label, val]) => {
        doc
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(label, 60, doc.y)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(val, 240, doc.y);
        doc.moveDown(0.25);
      });

      // Statutory Declaration
      doc.moveDown(0.8);
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#475569')
        .text(
          'I hereby certify that I have examined and calibrated the above-mentioned weighing/measuring instrument and found that it conforms to the accuracy standards prescribed under the Legal Metrology (General) Rules, 2011.',
          50,
          doc.y,
          { width: 490, align: 'justify' }
        );

      // Embed QR Code & Officer Signature Box
      doc.moveDown(1.5);
      const bottomY = doc.y;

      // QR Code on Left
      doc.image(qrImageBuffer, 60, bottomY, { width: 95, height: 95 });
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('SCAN TO VERIFY AUTHENTICITY', 45, bottomY + 100, { width: 125, align: 'center' });

      // Officer Signature Block on Right
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('DIGITALLY SIGNED & AUTHORIZED BY:', 320, bottomY);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(officerName || 'Inspector, Legal Metrology', 320, bottomY + 22);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Legal Metrology Officer', 320, bottomY + 38)
        .text('Government of India / State Directorate', 320, bottomY + 50)
        .text(`Token: ${verificationToken ? verificationToken.slice(0, 16) + '...' : 'AUTHENTICATED'}`, 320, bottomY + 65);

      // Footer Notice
      doc
        .fontSize(7.5)
        .font('Helvetica-Oblique')
        .fillColor('#94a3b8')
        .text(
          'This is a computer-generated digital verification certificate generated for Smart India Hackathon. It does not require physical ink seal.',
          40,
          doc.page.height - 45,
          { align: 'center', width: doc.page.width - 80 }
        );

      doc.end();

      writeStream.on('finish', () => {
        resolve(relativeUrl);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates an official Legal Metrology Statutory Fee Payment Receipt PDF
 * @param {Object} data Payment, application, instrument, and business details
 * @returns {Promise<string>} Relative file path to generated PDF
 */
const generateReceiptPDF = async ({
  receiptNumber,
  transactionId,
  applicationNumber,
  applicationType,
  businessName,
  businessAddress,
  applicantName,
  applicantPhone,
  applicantEmail,
  gstNumber,
  instrumentType,
  manufacturer,
  model,
  serialNumber,
  capacity,
  unit,
  location,
  feeBreakdown,
  paymentMethod = 'UPI',
  paidAt = new Date(),
  clientUrl = 'http://localhost:5173',
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const fileName = `Receipt-${receiptNumber}.pdf`;
      const filePath = path.join(receiptsDir, fileName);
      const relativeUrl = `/uploads/receipts/${fileName}`;

      // 1. Generate QR Code image buffer encoding receipt validation details
      const qrPayload = JSON.stringify({
        receiptNumber,
        transactionId,
        applicationNumber,
        serialNumber,
        totalAmount: feeBreakdown?.totalAmount,
        paidAt,
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 110,
        color: {
          dark: '#0b3b60',
          light: '#ffffff',
        },
      });
      const qrImageBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

      // 2. Initialize PDFKit document (A4, portrait)
      const doc = new PDFDocument({
        size: 'A4',
        margin: 35,
        info: {
          Title: `Statutory Fee Payment Receipt - ${receiptNumber}`,
          Author: 'Legal Metrology Department, Ministry of Consumer Affairs',
          Subject: 'Statutory Verification & Stamping Fee Payment Receipt',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Ornamental Outer Borders
      doc
        .lineWidth(2.5)
        .strokeColor('#0b3b60')
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor('#c59b27')
        .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
        .stroke();

      // Top Prototype / Statutory Notice
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('SMART INDIA HACKATHON — LEGAL METROLOGY VERIFICATION SYSTEM (ID: 26036)', 40, 30, {
          align: 'center',
          characterSpacing: 0.5,
        });

      // Government Department Header
      doc.moveDown(0.5);
      doc
        .fontSize(15)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('GOVERNMENT OF INDIA / STATE LEGAL METROLOGY DIRECTORATE', { align: 'center' });

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text('DEPARTMENT OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', { align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text('WEIGHTS & MEASURES DIVISION — CENTRAL E-PAYMENT GATEWAY', { align: 'center' });

      doc.moveDown(0.4);
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text('OFFICIAL STATUTORY FEE PAYMENT RECEIPT', { align: 'center' });

      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#64748b')
        .text('[Issued under Rule 16 of Legal Metrology (General) Rules, 2011]', { align: 'center' });

      // Horizontal Divider
      doc.moveDown(0.4);
      doc
        .strokeColor('#0b3b60')
        .lineWidth(1)
        .moveTo(35, doc.y)
        .lineTo(doc.page.width - 35, doc.y)
        .stroke();

      // Top Summary Banner Box (Receipt No, Date, Status, Transaction ID)
      doc.moveDown(0.6);
      const bannerTop = doc.y;
      doc
        .fillColor('#f8fafc')
        .rect(35, bannerTop, doc.page.width - 70, 48)
        .fill();

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(0.8)
        .rect(35, bannerTop, doc.page.width - 70, 48)
        .stroke();

      // Left Column in Banner
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Receipt Number:', 45, bannerTop + 8)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(receiptNumber, 150, bannerTop + 8);

      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Application Ref:', 45, bannerTop + 26)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(applicationNumber || '-', 150, bannerTop + 26);

      // Right Column in Banner
      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Transaction / UTR ID:', 310, bannerTop + 8)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(transactionId, 430, bannerTop + 8);

      doc
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('Payment Status:', 310, bannerTop + 26)
        .font('Helvetica-Bold')
        .fillColor('#166534')
        .text('COMPLETED (PAID)', 430, bannerTop + 26);

      // SECTION 1: Establishment & Payer Details
      doc.y = bannerTop + 56;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('1. PAYER & ESTABLISHMENT PARTICULARS', 40, doc.y);

      doc.moveDown(0.3);
      const payerBoxY = doc.y;
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.7)
        .rect(40, payerBoxY, doc.page.width - 80, 52)
        .stroke();

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('Establishment Name:', 48, payerBoxY + 6)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(businessName || '-', 165, payerBoxY + 6);

      doc
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('Authorized Applicant:', 48, payerBoxY + 20)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(`${applicantName || '-'} (${applicantPhone || '-'})`, 165, payerBoxY + 20);

      doc
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('Premises Location:', 48, payerBoxY + 34)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(businessAddress || 'Registered Commercial Premises', 165, payerBoxY + 34, { width: 340 });

      // SECTION 2: Machine / Measuring Instrument Specifications
      doc.y = payerBoxY + 60;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('2. MACHINE / INSTRUMENT DETAILS (FEE ASSESSMENT BASIS)', 40, doc.y);

      doc.moveDown(0.3);
      const machineBoxY = doc.y;
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.7)
        .rect(40, machineBoxY, doc.page.width - 80, 68)
        .stroke();

      const machineDetails = [
        ['Instrument Category:', instrumentType || 'Electronic Scale', 'Rated Capacity:', `${capacity || 0} ${unit || 'kg'}`],
        ['Manufacturer / Brand:', manufacturer || '-', 'Model Designation:', model || '-'],
        ['Stamped Serial No:', serialNumber || '-', 'Application Type:', applicationType || 'INITIAL'],
        ['Machine Premise Spot:', location || 'Commercial Counter', 'Payment Date & Time:', new Date(paidAt).toLocaleString('en-IN')],
      ];

      let rowY = machineBoxY + 6;
      machineDetails.forEach(([l1, v1, l2, v2]) => {
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#475569')
          .text(l1, 48, rowY)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(v1, 165, rowY);

        doc
          .font('Helvetica-Bold')
          .fillColor('#475569')
          .text(l2, 320, rowY)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(v2, 430, rowY);

        rowY += 15;
      });

      // SECTION 3: Itemized Fee Calculation Table
      doc.y = machineBoxY + 76;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('3. STATUTORY FEE COMPUTATION & TAX INVOICE', 40, doc.y);

      doc.moveDown(0.3);
      const tableY = doc.y;
      const tableWidth = doc.page.width - 80;

      // Table Header Row
      doc
        .fillColor('#0b3b60')
        .rect(40, tableY, tableWidth, 18)
        .fill();

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('Sr.', 46, tableY + 5)
        .text('Fee Description / Statutory Schedule Rule', 75, tableY + 5)
        .text('Rate Basis / Multiplier', 340, tableY + 5)
        .text('Amount (INR)', 480, tableY + 5, { align: 'right', width: 60 });

      // Table Items
      const statutoryFee = feeBreakdown?.statutoryFee || 0;
      const inspectionFee = feeBreakdown?.inspectionFee || 0;
      const subtotal = feeBreakdown?.subtotal || (statutoryFee + inspectionFee);
      const cgst = feeBreakdown?.cgst || Math.round(subtotal * 0.09 * 100) / 100;
      const sgst = feeBreakdown?.sgst || Math.round(subtotal * 0.09 * 100) / 100;
      const totalAmount = feeBreakdown?.totalAmount || Math.round(subtotal + cgst + sgst);

      const items = [
        ['1', `Statutory Verification & Stamping Fee (${instrumentType})`, `${capacity} ${unit} schedule`, `₹ ${statutoryFee.toFixed(2)}`],
        ['2', 'Metrological Physical Inspection & Testing Charge', 'Standard reference surcharge', `₹ ${inspectionFee.toFixed(2)}`],
        ['', 'Subtotal (Assessable Metrological Fee)', '', `₹ ${subtotal.toFixed(2)}`],
        ['', 'Central GST (CGST @ 9.0%)', 'Government Tax', `₹ ${cgst.toFixed(2)}`],
        ['', 'State GST (SGST @ 9.0%)', 'State Directorate Tax', `₹ ${sgst.toFixed(2)}`],
      ];

      let itemY = tableY + 18;
      items.forEach(([sr, desc, rate, amt], idx) => {
        const isSubtotal = idx >= 2;
        doc
          .fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff')
          .rect(40, itemY, tableWidth, 17)
          .fill();

        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .rect(40, itemY, tableWidth, 17)
          .stroke();

        doc
          .fontSize(8)
          .font(isSubtotal ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(isSubtotal ? '#0b3b60' : '#334155')
          .text(sr, 46, itemY + 4)
          .text(desc, 75, itemY + 4)
          .text(rate, 340, itemY + 4)
          .text(amt, 460, itemY + 4, { align: 'right', width: 80 });

        itemY += 17;
      });

      // Total Paid Highlight Row
      doc
        .fillColor('#e0f2fe')
        .rect(40, itemY, tableWidth, 22)
        .fill();

      doc
        .strokeColor('#0284c7')
        .lineWidth(1)
        .rect(40, itemY, tableWidth, 22)
        .stroke();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0369a1')
        .text('TOTAL STATUTORY AMOUNT PAID:', 75, itemY + 6);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text(`₹ ${totalAmount.toFixed(2)}`, 440, itemY + 5, { align: 'right', width: 100 });

      // Amount in Words
      itemY += 25;
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#334155')
        .text('Amount in Words:', 45, itemY)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(feeBreakdown?.amountInWords || `Rupees ${totalAmount} Only`, 140, itemY);

      // Payment Mode & Gateway
      itemY += 14;
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#334155')
        .text('Payment Gateway:', 45, itemY)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(`BharatKosh e-Treasury / Instant Settlement (Mode: ${paymentMethod})`, 140, itemY);

      // Embed QR Code & Seal Block
      doc.y = itemY + 22;
      const bottomY = doc.y;

      // QR Code on Left
      doc.image(qrImageBuffer, 50, bottomY, { width: 80, height: 80 });
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('SCAN TO VALIDATE RECEIPT', 40, bottomY + 84, { width: 100, align: 'center' });

      // Treasury Seal / Authenticity Notice on Right
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#0b3b60')
        .text('ELECTRONIC TREASURY RECEIPT VALIDATION', 220, bottomY + 5);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#475569')
        .text(
          'This is a digitally generated statutory receipt acknowledged by the Legal Metrology Division, Ministry of Consumer Affairs, Food & Public Distribution. It stands as legal proof of fee payment under the Weights and Measures Act.',
          220,
          bottomY + 19,
          { width: 320, align: 'justify' }
        );

      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#166534')
        .text('✓ DIGITAL SIGNATURE VERIFIED — GOVT. OF INDIA E-PORTAL', 220, bottomY + 60);

      // Footer Notice
      doc
        .fontSize(7)
        .font('Helvetica-Oblique')
        .fillColor('#94a3b8')
        .text(
          'Smart India Hackathon 2024 / 2026 Prototype — Problem Statement ID 26036. Computer-generated e-Receipt.',
          40,
          doc.page.height - 35,
          { align: 'center', width: doc.page.width - 80 }
        );

      doc.end();

      writeStream.on('finish', () => {
        resolve(relativeUrl);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateCertificatePDF,
  generateReceiptPDF,
};

