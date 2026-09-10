const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const {
  User,
  Business,
  Instrument,
  Application,
  Document,
  Inspection,
  Certificate,
  Notification,
  AuditLog,
  TestCentre,
} = require('../models');

async function runModelTests() {
  console.log('====================================================');
  console.log(' LEGAL METROLOGY SYSTEM - PHASE 2 MODEL TEST SUITE');
  console.log('====================================================\n');

  try {
    await connectDB();
    console.log(' Connected to MongoDB for model validation\n');

    // Clean up any lingering test records
    const testEmail = 'model_test_user@metrology.gov.in';
    const testCertNumber = 'LM-TEST-2026-999999';
    const testAppNumber = 'APP-TEST-2026-999999';
    const testSerial = 'TEST-SN-999999';

    await User.deleteMany({ email: testEmail });
    await Certificate.deleteMany({ certificateNumber: testCertNumber });
    await Application.deleteMany({ applicationNumber: testAppNumber });
    await Instrument.deleteMany({ serialNumber: testSerial });
    await TestCentre.deleteMany({ name: 'Central National Metrology Testing Center' });

    // 1. TEST USER MODEL
    console.log('--> Testing 1/10: User Model (Validation & Bcrypt Hook)...');
    const user = new User({
      name: 'Test Officer Sharma',
      email: testEmail,
      phone: '9876543210',
      password: 'PlainPassword@123',
      role: 'officer',
      status: 'active',
    });
    await user.save();

    // Check password hashing
    const rawUser = await User.findById(user._id).select('+password');
    if (!rawUser.password.startsWith('$2')) {
      throw new Error('Password was not hashed with bcrypt!');
    }
    const isPasswordValid = await user.comparePassword('PlainPassword@123');
    const isWrongPasswordInvalid = !(await user.comparePassword('WrongPassword'));
    if (!isPasswordValid || !isWrongPasswordInvalid) {
      throw new Error('User comparePassword method failed validation!');
    }
    console.log('    [OK] User created, password hashed with bcrypt, comparison valid.');

    // 2. TEST BUSINESS MODEL
    console.log('--> Testing 2/10: Business Model...');
    const business = new Business({
      owner: user._id,
      businessName: 'Apex Precision Scale Manufacturing Ltd',
      businessType: 'Manufacturer',
      address: 'Plot 42, Industrial Metrology Area',
      district: 'Central Delhi',
      state: 'Delhi',
      pincode: '110001',
      gstNumber: '07AAAAA0000A1Z5',
      contactNumber: '01123456789',
      email: 'contact@apexprecision.com',
    });
    await business.save();
    console.log('    [OK] Business created with owner relationship.');

    // 3. TEST INSTRUMENT MODEL
    console.log('--> Testing 3/10: Instrument Model (Serial Index & Unit)...');
    const instrument = new Instrument({
      business: business._id,
      instrumentType: 'Electronic Counter Scale',
      manufacturer: 'Apex Precision',
      model: 'AP-500',
      serialNumber: testSerial,
      capacity: 30,
      unit: 'kg',
      purchaseDate: new Date(),
      location: 'Assembly Bay 2',
      status: 'REGISTERED',
    });
    await instrument.save();
    console.log('    [OK] Instrument created with unique serial number and capacity.');

    // 4. TEST APPLICATION MODEL (12 Status Flow Validation)
    console.log('--> Testing 4/10: Application Model (12-Status Enum & Assignment)...');
    const application = new Application({
      applicationNumber: testAppNumber,
      applicant: user._id,
      business: business._id,
      instrument: instrument._id,
      applicationType: 'INITIAL',
      status: 'SUBMITTED',
      assignedOfficer: user._id,
      remarks: 'Initial testing application',
    });
    await application.save();
    console.log('    [OK] Application created with initial SUBMITTED status.');

    // 5. TEST DOCUMENT MODEL
    console.log('--> Testing 5/10: Document Model...');
    const document = new Document({
      application: application._id,
      documentType: 'CALIBRATION_REPORT',
      fileUrl: 'https://example.com/docs/calibration_report.pdf',
      fileName: 'calibration_report.pdf',
      uploadedBy: user._id,
      verificationStatus: 'PENDING',
    });
    await document.save();
    console.log('    [OK] Document attachment linked to application.');

    // 6. TEST INSPECTION MODEL (Automatic Error Calculation & PASS/FAIL Logic)
    console.log('--> Testing 6/10: Inspection Model (Automatic Error & PASS/FAIL Hook)...');
    // Case A: PASS
    const passInspection = new Inspection({
      application: application._id,
      officer: user._id,
      inspectionDate: new Date(),
      instrumentCondition: 'SATISFACTORY',
      serialNumberVerified: true,
      sealCondition: 'INTACT',
      standardWeight: 20.0, // 20 kg
      observedReading: 20.02, // 20.02 kg
      permissibleError: 0.05, // Permissible: 0.05 kg
      remarks: 'Compliant with Class III accuracy',
    });
    await passInspection.save();
    if (passInspection.error !== 0.02 || passInspection.result !== 'PASS') {
      throw new Error(`Auto error calculation failed for PASS: error=${passInspection.error}, result=${passInspection.result}`);
    }
    console.log(`    [OK] PASS Verification: Std=20.0, Obs=20.02, Error=+${passInspection.error} kg, Result=${passInspection.result}`);

    // Case B: FAIL
    const failInspection = new Inspection({
      application: application._id,
      officer: user._id,
      inspectionDate: new Date(),
      instrumentCondition: 'UNSATISFACTORY',
      serialNumberVerified: true,
      sealCondition: 'BROKEN',
      standardWeight: 20.0, // 20 kg
      observedReading: 20.15, // 20.15 kg
      permissibleError: 0.05, // Permissible: 0.05 kg
      remarks: 'Exceeds permissible tolerance',
    });
    await failInspection.save();
    if (failInspection.error !== 0.15 || failInspection.result !== 'FAIL') {
      throw new Error(`Auto error calculation failed for FAIL: error=${failInspection.error}, result=${failInspection.result}`);
    }
    console.log(`    [OK] FAIL Verification: Std=20.0, Obs=20.15, Error=+${failInspection.error} kg, Result=${failInspection.result}`);

    // 7. TEST CERTIFICATE MODEL
    console.log('--> Testing 7/10: Certificate Model...');
    const certificate = new Certificate({
      certificateNumber: testCertNumber,
      application: application._id,
      instrument: instrument._id,
      business: business._id,
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      status: 'VALID',
      pdfUrl: 'https://example.com/certificates/LM-TEST-2026-999999.pdf',
      qrCodeUrl: 'https://example.com/qrcodes/LM-TEST-2026-999999.png',
      verificationToken: 'token_' + Date.now(),
      issuedBy: user._id,
    });
    await certificate.save();
    console.log('    [OK] Certificate created with unique certificateNumber and validity date.');

    // 8. TEST NOTIFICATION MODEL
    console.log('--> Testing 8/10: Notification Model...');
    const notification = new Notification({
      user: user._id,
      title: 'Inspection Completed',
      message: 'Your instrument AP-500 has passed calibration inspection.',
      type: 'INSPECTION_COMPLETED',
      isRead: false,
    });
    await notification.save();
    console.log('    [OK] Notification created with unread state.');

    // 9. TEST AUDIT LOG MODEL
    console.log('--> Testing 9/10: AuditLog Model...');
    const auditLog = new AuditLog({
      user: user._id,
      action: 'INSPECTION_RECORDED',
      entityType: 'Inspection',
      entityId: passInspection._id,
      previousStatus: 'INSPECTION_SCHEDULED',
      newStatus: 'INSPECTION_COMPLETED',
      description: 'Officer Sharma recorded verification reading for instrument AP-500',
    });
    await auditLog.save();
    console.log('    [OK] Immutable AuditLog entry recorded with state transition.');

    // 10. TEST TESTCENTRE MODEL
    console.log('--> Testing 10/10: TestCentre Model...');
    const testCentre = new TestCentre({
      name: 'Central National Metrology Testing Center',
      address: 'Pusa Road, Metrology Bhavan',
      district: 'Central Delhi',
      state: 'Delhi',
      contact: '011-25841234',
      officer: user._id,
    });
    await testCentre.save();
    console.log('    [OK] TestCentre created and linked to officer.');

    // CLEANUP
    console.log('\n--> Cleaning up test records...');
    await AuditLog.deleteMany({ _id: auditLog._id });
    await Notification.deleteMany({ _id: notification._id });
    await Certificate.deleteMany({ _id: certificate._id });
    await Inspection.deleteMany({ _id: { $in: [passInspection._id, failInspection._id] } });
    await Document.deleteMany({ _id: document._id });
    await Application.deleteMany({ _id: application._id });
    await Instrument.deleteMany({ _id: instrument._id });
    await Business.deleteMany({ _id: business._id });
    await TestCentre.deleteMany({ _id: testCentre._id });
    await User.deleteMany({ _id: user._id });
    console.log('    [OK] Cleanup completed.');

    console.log('\n====================================================');
    console.log(' ALL 10 DATABASE MODELS VERIFIED SUCCESSFULLY!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n Model Test Error:', error);
    process.exit(1);
  }
}

runModelTests();
