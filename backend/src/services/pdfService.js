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

module.exports = { generateCertificatePDF };
