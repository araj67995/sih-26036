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
const { generateCertificatePDF } = require('../services/pdfService');

async function seedDatabase() {
  console.log('====================================================');
  console.log(' SEEDING LEGAL METROLOGY DATABASE (SIH 26036)');
  console.log('====================================================\n');

  try {
    await connectDB();

    console.log('--> Purging previous records...');
    await Promise.all([
      User.deleteMany({}),
      Business.deleteMany({}),
      Instrument.deleteMany({}),
      Application.deleteMany({}),
      Document.deleteMany({}),
      Inspection.deleteMany({}),
      Certificate.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      TestCentre.deleteMany({}),
    ]);
    console.log('    [OK] Collections cleared.');

    // 1. CREATE ADMIN USER
    console.log('--> Creating Administrator...');
    const admin = await User.create({
      name: 'Dr. K. S. Verma',
      email: 'admin@metrology.gov.in',
      phone: '9811001122',
      password: 'Admin@123',
      role: 'admin',
      status: 'active',
    });

    // 2. CREATE LEGAL METROLOGY OFFICERS (INSPECTORS)
    console.log('--> Creating Legal Metrology Officers...');
    const officer1 = await User.create({
      name: 'Inspector Rajesh Sharma',
      email: 'officer1@metrology.gov.in',
      phone: '9822003344',
      password: 'Officer@123',
      role: 'officer',
      status: 'active',
    });

    const officer2 = await User.create({
      name: 'Inspector Ananya Sen',
      email: 'officer2@metrology.gov.in',
      phone: '9833005566',
      password: 'Officer@123',
      role: 'officer',
      status: 'active',
    });

    // 3. CREATE 5 APPLICANTS & BUSINESSES
    console.log('--> Creating Applicants and Businesses...');
    const applicantsData = [
      {
        name: 'Ramesh Gupta',
        email: 'applicant@demo.com',
        phone: '9844007788',
        password: 'Password@123',
        businessName: 'Gupta Kirana & General Store',
        businessType: 'Retailer / Trader',
        address: 'Shop No. 12, Main Chandni Chowk Market',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110006',
        gstNumber: '07AAAAA1111A1Z1',
      },
      {
        name: 'Pooja Agarwal',
        email: 'trader.delhi@demo.com',
        phone: '9855008899',
        password: 'Password@123',
        businessName: 'Agarwal Super Mart Pvt. Ltd.',
        businessType: 'Retailer / Trader',
        address: 'M-Block Market, Greater Kailash 2',
        district: 'South Delhi',
        state: 'Delhi',
        pincode: '110048',
        gstNumber: '07BBBBB2222B1Z2',
      },
      {
        name: 'Vikram Choudhary',
        email: 'grain.merchant@demo.com',
        phone: '9866009900',
        password: 'Password@123',
        businessName: 'Kisan Agro Terminal & Weighbridge',
        businessType: 'Logistics & Warehousing',
        address: 'Narela Mandi, Shed No. 4',
        district: 'North Delhi',
        state: 'Delhi',
        pincode: '110040',
        gstNumber: '07CCCCC3333C1Z3',
      },
      {
        name: 'Siddharth Mehta',
        email: 'jewel.craft@demo.com',
        phone: '9877001122',
        password: 'Password@123',
        businessName: 'Mehta Sons Heritage Jewellers',
        businessType: 'Manufacturer',
        address: 'Dariba Kalan, Old Delhi',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110006',
        gstNumber: '07DDDDD4444D1Z4',
      },
      {
        name: 'Harpreet Singh',
        email: 'oil.fuel@demo.com',
        phone: '9888002233',
        password: 'Password@123',
        businessName: 'Capital Highway Auto Fuel Station',
        businessType: 'Authorized Dealer',
        address: 'NH-44 Outer Ring Road',
        district: 'North West Delhi',
        state: 'Delhi',
        pincode: '110033',
        gstNumber: '07EEEEE5555E1Z5',
      },
    ];

    const users = [];
    const businesses = [];

    for (const data of applicantsData) {
      const u = await User.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'applicant',
        status: 'active',
      });
      users.push(u);

      const b = await Business.create({
        owner: u._id,
        businessName: data.businessName,
        businessType: data.businessType,
        address: data.address,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        gstNumber: data.gstNumber,
        contactNumber: data.phone,
        email: data.email,
      });
      businesses.push(b);
    }
    console.log(`    [OK] Created ${users.length} applicants with commercial businesses.`);

    // 4. CREATE INSTRUMENTS
    console.log('--> Creating Weighing & Measuring Instruments...');
    const instruments = await Instrument.create([
      {
        business: businesses[0]._id,
        instrumentType: 'Electronic Counter Scale',
        manufacturer: 'Avery India',
        model: 'AV-30C',
        serialNumber: 'SN-AV-2026-001',
        capacity: 30,
        unit: 'kg',
        purchaseDate: new Date('2025-08-10'),
        location: 'Counter 1 (Billing)',
        status: 'VERIFIED',
      },
      {
        business: businesses[0]._id,
        instrumentType: 'Electronic Platform Scale',
        manufacturer: 'Eagle Scales',
        model: 'EG-150P',
        serialNumber: 'SN-EG-2026-042',
        capacity: 150,
        unit: 'kg',
        purchaseDate: new Date('2025-11-20'),
        location: 'Warehouse Storage Rack A',
        status: 'VERIFICATION_PENDING',
      },
      {
        business: businesses[1]._id,
        instrumentType: 'Electronic Counter Scale',
        manufacturer: 'Essae-Teraoka',
        model: 'DS-215',
        serialNumber: 'SN-ES-2026-108',
        capacity: 15,
        unit: 'kg',
        purchaseDate: new Date('2025-09-15'),
        location: 'Vegetable Section Counter 3',
        status: 'VERIFIED',
      },
      {
        business: businesses[2]._id,
        instrumentType: 'Weighbridge / Heavy Capacity Scale',
        manufacturer: 'Leotronic Sensors',
        model: 'WB-60T',
        serialNumber: 'SN-LT-2026-901',
        capacity: 60,
        unit: 'ton',
        purchaseDate: new Date('2024-05-12'),
        location: 'Gate 1 Heavy Inbound Truck Bay',
        status: 'VERIFICATION_PENDING',
      },
      {
        business: businesses[3]._id,
        instrumentType: 'Precision / Analytical Balance (Class I/II)',
        manufacturer: 'Sartorius Metrology',
        model: 'ME-204-Gold',
        serialNumber: 'SN-SR-2026-777',
        capacity: 500,
        unit: 'g',
        purchaseDate: new Date('2025-01-10'),
        location: 'Hallmark Valuation Counter',
        status: 'VERIFIED',
      },
      {
        business: businesses[4]._id,
        instrumentType: 'Fuel Dispensing Unit / Flow Meter',
        manufacturer: 'Tokheim India',
        model: 'TK-Quantium-500',
        serialNumber: 'SN-TK-2026-554',
        capacity: 80,
        unit: 'L',
        purchaseDate: new Date('2024-10-05'),
        location: 'Fuel Island No. 2',
        status: 'VERIFICATION_PENDING',
      },
    ]);
    console.log(`    [OK] Registered ${instruments.length} test instruments across businesses.`);

    // 5. CREATE APPLICATIONS AT VARIOUS STATUSES
    console.log('--> Creating Applications spanning lifecycle statuses...');

    // App 1: CERTIFICATE_ISSUED (Applicant 0, Instrument 0)
    const app1 = await Application.create({
      applicationNumber: 'APP-2026-10001',
      applicant: users[0]._id,
      business: businesses[0]._id,
      instrument: instruments[0]._id,
      applicationType: 'INITIAL',
      status: 'CERTIFICATE_ISSUED',
      assignedOfficer: officer1._id,
      submittedAt: new Date('2026-01-05'),
      inspectionDate: new Date('2026-01-12'),
      remarks: 'Verified, calibrated and approved. Stamped with seal LM-DELHI-26.',
    });

    // App 2: INSPECTION_SCHEDULED (Applicant 0, Instrument 1)
    const app2 = await Application.create({
      applicationNumber: 'APP-2026-10002',
      applicant: users[0]._id,
      business: businesses[0]._id,
      instrument: instruments[1]._id,
      applicationType: 'INITIAL',
      status: 'INSPECTION_SCHEDULED',
      assignedOfficer: officer1._id,
      submittedAt: new Date('2026-02-10'),
      inspectionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      remarks: 'Inspection scheduled at trader shop premises.',
    });

    // App 3: CERTIFICATE_ISSUED (Applicant 1, Instrument 2)
    const app3 = await Application.create({
      applicationNumber: 'APP-2026-10003',
      applicant: users[1]._id,
      business: businesses[1]._id,
      instrument: instruments[2]._id,
      applicationType: 'INITIAL',
      status: 'CERTIFICATE_ISSUED',
      assignedOfficer: officer2._id,
      submittedAt: new Date('2026-01-15'),
      inspectionDate: new Date('2026-01-20'),
      remarks: 'Verified satisfactory within Class III limits.',
    });

    // App 4: DOCUMENT_VERIFICATION (Applicant 2, Instrument 3)
    const app4 = await Application.create({
      applicationNumber: 'APP-2026-10004',
      applicant: users[2]._id,
      business: businesses[2]._id,
      instrument: instruments[3]._id,
      applicationType: 'RENEWAL',
      status: 'DOCUMENT_VERIFICATION',
      assignedOfficer: officer1._id,
      submittedAt: new Date('2026-02-18'),
      remarks: 'Weighbridge annual calibration documents submitted.',
    });

    // App 5: CERTIFICATE_ISSUED (Applicant 3, Instrument 4)
    const app5 = await Application.create({
      applicationNumber: 'APP-2026-10005',
      applicant: users[3]._id,
      business: businesses[3]._id,
      instrument: instruments[4]._id,
      applicationType: 'INITIAL',
      status: 'CERTIFICATE_ISSUED',
      assignedOfficer: officer2._id,
      submittedAt: new Date('2026-01-25'),
      inspectionDate: new Date('2026-01-28'),
      remarks: 'Precision balance verified with Class E2 test weights.',
    });

    // App 6: SUBMITTED (Applicant 4, Instrument 5)
    const app6 = await Application.create({
      applicationNumber: 'APP-2026-10006',
      applicant: users[4]._id,
      business: businesses[4]._id,
      instrument: instruments[5]._id,
      applicationType: 'INITIAL',
      status: 'SUBMITTED',
      assignedOfficer: officer2._id,
      submittedAt: new Date(),
      remarks: 'Flow meter dispenser initial verification requested.',
    });

    console.log('    [OK] Applications created across SUBMITTED, DOCUMENT_VERIFICATION, INSPECTION_SCHEDULED, and CERTIFICATE_ISSUED.');

    // 6. CREATE SAMPLE INSPECTION RECORDS
    console.log('--> Creating Inspection Observations with automatic error calculations...');

    // Inspection for App 1: Standard = 20.0 kg, Observed = 20.02 kg => Error = +0.02 kg <= 0.05 => PASS
    const insp1 = await Inspection.create({
      application: app1._id,
      officer: officer1._id,
      inspectionDate: new Date('2026-01-12'),
      instrumentCondition: 'SATISFACTORY',
      serialNumberVerified: true,
      sealCondition: 'INTACT',
      standardWeight: 20.0,
      observedReading: 20.02,
      error: 0.02,
      permissibleError: 0.05,
      result: 'PASS',
      remarks: 'Within maximum permissible error for Class III counter scale.',
    });

    // Inspection for App 3: Standard = 10.0 kg, Observed = 10.01 kg => Error = +0.01 kg <= 0.03 => PASS
    const insp3 = await Inspection.create({
      application: app3._id,
      officer: officer2._id,
      inspectionDate: new Date('2026-01-20'),
      instrumentCondition: 'SATISFACTORY',
      serialNumberVerified: true,
      sealCondition: 'INTACT',
      standardWeight: 10.0,
      observedReading: 10.01,
      error: 0.01,
      permissibleError: 0.03,
      result: 'PASS',
      remarks: 'Corner load test and repeatability test passed.',
    });

    // Inspection for App 5: Standard = 200.0 g, Observed = 200.002 g => Error = +0.002 g <= 0.005 => PASS
    const insp5 = await Inspection.create({
      application: app5._id,
      officer: officer2._id,
      inspectionDate: new Date('2026-01-28'),
      instrumentCondition: 'SATISFACTORY',
      serialNumberVerified: true,
      sealCondition: 'INTACT',
      standardWeight: 200.0,
      observedReading: 200.002,
      error: 0.002,
      permissibleError: 0.005,
      result: 'PASS',
      remarks: 'Jewellery precision scale passed Class II standard test.',
    });

    console.log('    [OK] Inspections recorded with PASS metrology measurements.');

    // 7. GENERATE CERTIFICATES WITH QR CODES & PDFS
    console.log('--> Generating PDF Certificates with QR Codes...');

    const cert1Number = 'LM-DL-2026-000001';
    const cert1Token = `TOKEN-${Date.now()}-A1B2C3D4`;
    const cert1Pdf = await generateCertificatePDF({
      certificateNumber: cert1Number,
      businessName: businesses[0].businessName,
      businessAddress: `${businesses[0].address}, ${businesses[0].district}, ${businesses[0].state}`,
      instrumentType: instruments[0].instrumentType,
      manufacturer: instruments[0].manufacturer,
      model: instruments[0].model,
      serialNumber: instruments[0].serialNumber,
      capacity: instruments[0].capacity,
      unit: instruments[0].unit,
      standardWeight: insp1.standardWeight,
      observedReading: insp1.observedReading,
      error: insp1.error,
      issueDate: new Date('2026-01-12'),
      validUntil: new Date('2027-01-11'),
      officerName: officer1.name,
      verificationToken: cert1Token,
    });

    await Certificate.create({
      certificateNumber: cert1Number,
      application: app1._id,
      instrument: instruments[0]._id,
      business: businesses[0]._id,
      issueDate: new Date('2026-01-12'),
      validUntil: new Date('2027-01-11'),
      status: 'VALID',
      pdfUrl: cert1Pdf,
      qrCodeUrl: `/verify/${cert1Number}`,
      verificationToken: cert1Token,
      issuedBy: officer1._id,
    });

    const cert3Number = 'LM-DL-2026-000002';
    const cert3Token = `TOKEN-${Date.now()}-E5F6G7H8`;
    const cert3Pdf = await generateCertificatePDF({
      certificateNumber: cert3Number,
      businessName: businesses[1].businessName,
      businessAddress: `${businesses[1].address}, ${businesses[1].district}, ${businesses[1].state}`,
      instrumentType: instruments[2].instrumentType,
      manufacturer: instruments[2].manufacturer,
      model: instruments[2].model,
      serialNumber: instruments[2].serialNumber,
      capacity: instruments[2].capacity,
      unit: instruments[2].unit,
      standardWeight: insp3.standardWeight,
      observedReading: insp3.observedReading,
      error: insp3.error,
      issueDate: new Date('2026-01-20'),
      validUntil: new Date('2027-01-19'),
      officerName: officer2.name,
      verificationToken: cert3Token,
    });

    await Certificate.create({
      certificateNumber: cert3Number,
      application: app3._id,
      instrument: instruments[2]._id,
      business: businesses[1]._id,
      issueDate: new Date('2026-01-20'),
      validUntil: new Date('2027-01-19'),
      status: 'VALID',
      pdfUrl: cert3Pdf,
      qrCodeUrl: `/verify/${cert3Number}`,
      verificationToken: cert3Token,
      issuedBy: officer2._id,
    });

    const cert5Number = 'LM-DL-2026-000003';
    const cert5Token = `TOKEN-${Date.now()}-I9J0K1L2`;
    const cert5Pdf = await generateCertificatePDF({
      certificateNumber: cert5Number,
      businessName: businesses[3].businessName,
      businessAddress: `${businesses[3].address}, ${businesses[3].district}, ${businesses[3].state}`,
      instrumentType: instruments[4].instrumentType,
      manufacturer: instruments[4].manufacturer,
      model: instruments[4].model,
      serialNumber: instruments[4].serialNumber,
      capacity: instruments[4].capacity,
      unit: instruments[4].unit,
      standardWeight: insp5.standardWeight,
      observedReading: insp5.observedReading,
      error: insp5.error,
      issueDate: new Date('2026-01-28'),
      validUntil: new Date('2027-01-27'),
      officerName: officer2.name,
      verificationToken: cert5Token,
    });

    await Certificate.create({
      certificateNumber: cert5Number,
      application: app5._id,
      instrument: instruments[4]._id,
      business: businesses[3]._id,
      issueDate: new Date('2026-01-28'),
      validUntil: new Date('2027-01-27'),
      status: 'VALID',
      pdfUrl: cert5Pdf,
      qrCodeUrl: `/verify/${cert5Number}`,
      verificationToken: cert5Token,
      issuedBy: officer2._id,
    });

    console.log('    [OK] Generated Certificates LM-DL-2026-000001, 000002, and 000003 with QR and PDFs.');

    // 8. CREATE TEST CENTRES
    console.log('--> Creating Accredited Test Centres...');
    await TestCentre.create([
      {
        name: 'Delhi State Legal Metrology Calibration Lab',
        address: 'Old Secretariat, Civil Lines',
        district: 'Central Delhi',
        state: 'Delhi',
        contact: '011-23890123',
        officer: officer1._id,
      },
      {
        name: 'South Delhi Metrological Standards Facility',
        address: 'Pushp Vihar, Sector 4',
        district: 'South Delhi',
        state: 'Delhi',
        contact: '011-29567890',
        officer: officer2._id,
      },
      {
        name: 'North Delhi Heavy Weighbridge Testing Facility',
        address: 'Narela Industrial Area, Phase II',
        district: 'North Delhi',
        state: 'Delhi',
        contact: '011-27781234',
        officer: officer1._id,
      },
    ]);
    console.log('    [OK] Test Centres populated.');

    // 9. CREATE INITIAL AUDIT LOG ENTRIES
    console.log('--> Populating Audit Trail...');
    await AuditLog.create([
      {
        user: admin._id,
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'System',
        entityId: 'SYSTEM-ROOT',
        description: 'System master configuration initialized by Administrator Dr. K. S. Verma',
        timestamp: new Date('2026-01-01'),
      },
      {
        user: officer1._id,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'Certificate',
        entityId: cert1Number,
        previousStatus: 'INSPECTION_COMPLETED',
        newStatus: 'CERTIFICATE_ISSUED',
        description: `Officer Rajesh Sharma issued digital certificate ${cert1Number}`,
        timestamp: new Date('2026-01-12'),
      },
      {
        user: officer2._id,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'Certificate',
        entityId: cert3Number,
        previousStatus: 'INSPECTION_COMPLETED',
        newStatus: 'CERTIFICATE_ISSUED',
        description: `Officer Ananya Sen issued digital certificate ${cert3Number}`,
        timestamp: new Date('2026-01-20'),
      },
    ]);
    console.log('    [OK] Audit entries logged.');

    // 10. CREATE INITIAL NOTIFICATIONS
    console.log('--> Populating Notifications...');
    await Notification.create([
      {
        user: users[0]._id,
        title: 'Verification Certificate Ready',
        message: `Your certificate ${cert1Number} for Avery India AV-30C is now available for download.`,
        type: 'CERTIFICATE_ISSUED',
        isRead: false,
      },
      {
        user: users[0]._id,
        title: 'Inspection Scheduled',
        message: 'Inspection for your platform scale EG-150P has been scheduled.',
        type: 'INSPECTION_SCHEDULED',
        isRead: true,
      },
      {
        user: officer1._id,
        title: 'New Verification Assigned',
        message: 'A new weighing scale verification application APP-2026-10004 has been assigned to you.',
        type: 'APPLICATION_SUBMITTED',
        isRead: false,
      },
    ]);
    console.log('    [OK] In-app notifications generated.');

    console.log('\n====================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('\n DEMO LOGIN CREDENTIALS:');
    console.log(' --------------------------------------------------');
    console.log(' [Admin]     : admin@metrology.gov.in    / Admin@123');
    console.log(' [Officer 1] : officer1@metrology.gov.in / Officer@123');
    console.log(' [Officer 2] : officer2@metrology.gov.in / Officer@123');
    console.log(' [Applicant] : applicant@demo.com        / Password@123');
    console.log(' --------------------------------------------------');
    console.log(' Sample Verified Certificate Number for Public Check:');
    console.log(` ${cert1Number} or ${cert3Number} or ${cert5Number}`);
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Seeding Failed:', error);
    process.exit(1);
  }
}

seedDatabase();
