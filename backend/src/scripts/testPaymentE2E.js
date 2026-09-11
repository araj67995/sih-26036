const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const { calculateMachineFee } = require('../utils/feeCalculator');
const { User, Business, Instrument, Application, Payment } = require('../models');
const { generateReceiptPDF } = require('../services/pdfService');

async function testPaymentSystem() {
  console.log('====================================================');
  console.log(' LEGAL METROLOGY — STATUTORY PAYMENT & RECEIPT TEST');
  console.log('====================================================\n');

  try {
    await connectDB();

    // 1. TEST MACHINE FEE CALCULATION ENGINE
    console.log('1. Testing Fee Calculation According to Machine Specifications:');

    const testCases = [
      {
        machine: { instrumentType: 'Electronic Counter Scale', capacity: 15, unit: 'kg' },
        type: 'INITIAL',
        expectedBase: 200,
      },
      {
        machine: { instrumentType: 'Electronic Counter Scale', capacity: 35, unit: 'kg' },
        type: 'INITIAL',
        expectedBase: 350,
      },
      {
        machine: { instrumentType: 'Electronic Platform Scale', capacity: 150, unit: 'kg' },
        type: 'INITIAL',
        expectedBase: 750,
      },
      {
        machine: { instrumentType: 'Weighbridge / Heavy Capacity Scale', capacity: 50, unit: 'ton' },
        type: 'INITIAL',
        expectedBase: 3500,
      },
      {
        machine: { instrumentType: 'Precision / Analytical Balance (Class I/II)', capacity: 220, unit: 'g' },
        type: 'INITIAL',
        expectedBase: 1200,
      },
      {
        machine: { instrumentType: 'Fuel Dispensing Unit / Flow Meter', capacity: 100, unit: 'L' },
        type: 'RE_VERIFICATION', // 1.25x
        expectedBase: Math.round(1800 * 1.25),
      },
    ];

    testCases.forEach(({ machine, type, expectedBase }) => {
      const fee = calculateMachineFee(machine, type);
      if (fee.statutoryFee !== expectedBase) {
        throw new Error(`Fee calculation mismatch for ${machine.instrumentType}: expected ${expectedBase}, got ${fee.statutoryFee}`);
      }
      console.log(`   [PASS] ${machine.instrumentType} (${machine.capacity} ${machine.unit}) [${type}]:`);
      console.log(`          Statutory: ₹${fee.statutoryFee}, Inspection: ₹${fee.inspectionFee}, Subtotal: ₹${fee.subtotal}, GST: ₹${fee.totalGst}, Total: ₹${fee.totalAmount}`);
      console.log(`          Amount in Words: "${fee.amountInWords}"`);
    });

    // 2. TEST USER & INSTRUMENT LOOKUP OR CREATION
    console.log('\n2. Fetching demo applicant and registered instrument...');
    let applicant = await User.findOne({ role: 'applicant' });
    if (!applicant) {
      applicant = await User.create({
        name: 'Test Applicant',
        email: `applicant-${Date.now()}@demo.com`,
        phone: '9811223344',
        password: 'Password@123',
        role: 'applicant',
        status: 'active',
      });
    }

    let business = await Business.findOne({ owner: applicant._id });
    if (!business) {
      business = await Business.create({
        owner: applicant._id,
        businessName: 'Apex Precision Traders Pvt Ltd',
        businessType: 'Retailer / Trader',
        address: '42 Commercial Plaza, Connaught Place',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110001',
        gstNumber: '07AAAAA9999A1Z9',
      });
    }

    const testInstrument = await Instrument.create({
      business: business._id,
      instrumentType: 'Electronic Platform Scale',
      manufacturer: 'Mettler Toledo',
      model: 'MT-IND-200',
      serialNumber: `SN-TEST-PAY-${Date.now().toString().slice(-6)}`,
      capacity: 200,
      unit: 'kg',
      location: 'Warehouse Loading Bay 3',
      status: 'REGISTERED',
    });
    console.log(`   [OK] Registered Machine: ${testInstrument.model} (SN: ${testInstrument.serialNumber}, 200 kg)`);

    // 3. CREATE APPLICATION & GENERATE PAYMENT & RECEIPT
    console.log('\n3. Processing Application Submission with Machine-Based Payment...');
    const feeBreakdown = calculateMachineFee(testInstrument, 'INITIAL');
    const year = new Date().getFullYear();
    const receiptNumber = `RCP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    const transactionId = `TXN-${year}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const appNumber = `APP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    const paidAt = new Date();

    console.log(`   --> Generating Official PDF Receipt with embedded QR code...`);
    const receiptPdfUrl = await generateReceiptPDF({
      receiptNumber,
      transactionId,
      applicationNumber: appNumber,
      applicationType: 'INITIAL',
      businessName: business.businessName,
      businessAddress: `${business.address}, ${business.district}, ${business.state} - ${business.pincode}`,
      applicantName: applicant.name,
      applicantPhone: applicant.phone,
      applicantEmail: applicant.email,
      gstNumber: business.gstNumber,
      instrumentType: testInstrument.instrumentType,
      manufacturer: testInstrument.manufacturer,
      model: testInstrument.model,
      serialNumber: testInstrument.serialNumber,
      capacity: testInstrument.capacity,
      unit: testInstrument.unit,
      location: testInstrument.location,
      feeBreakdown,
      paymentMethod: 'UPI',
      paidAt,
      clientUrl: 'http://localhost:5173',
    });

    console.log(`   [OK] PDF Receipt created: ${receiptPdfUrl}`);
    const fullPdfPath = path.join(__dirname, '..', receiptPdfUrl);
    if (!fs.existsSync(fullPdfPath)) {
      throw new Error(`Generated PDF receipt not found on disk at: ${fullPdfPath}`);
    }
    const stat = fs.statSync(fullPdfPath);
    console.log(`   [OK] PDF Verified on Disk: File size is ${stat.size} bytes`);

    // Create Application in DB
    const application = await Application.create({
      applicationNumber: appNumber,
      applicant: applicant._id,
      business: business._id,
      instrument: testInstrument._id,
      applicationType: 'INITIAL',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      submittedAt: new Date(),
      remarks: 'Automated test application with machine-based statutory fee',
    });

    // Create Payment in DB
    const payment = await Payment.create({
      receiptNumber,
      transactionId,
      application: application._id,
      applicant: applicant._id,
      business: business._id,
      instrument: testInstrument._id,
      applicationType: 'INITIAL',
      feeBreakdown,
      currency: 'INR',
      paymentMethod: 'UPI',
      paymentGateway: 'BharatKosh / Legal Metrology Instant Settlement',
      status: 'PAID',
      paidAt,
      receiptPdfUrl,
      remarks: 'Statutory verification fee paid at submission',
    });

    application.payment = payment._id;
    await application.save();

    console.log(`   [OK] Application ${application.applicationNumber} linked to Payment ${payment.receiptNumber}`);

    // 4. VERIFY QUERY & POPULATION
    console.log('\n4. Verifying Payment & Application Retrieval with population...');
    const fetchedPayment = await Payment.findById(payment._id)
      .populate('instrument')
      .populate('business')
      .populate('applicant')
      .populate('application');

    if (!fetchedPayment) throw new Error('Failed to fetch payment');
    if (fetchedPayment.instrument.serialNumber !== testInstrument.serialNumber) {
      throw new Error('Instrument serial mismatch in payment record');
    }
    if (fetchedPayment.feeBreakdown.totalAmount !== feeBreakdown.totalAmount) {
      throw new Error('Total amount mismatch in payment record');
    }
    console.log(`   [OK] Retrieved Payment ${fetchedPayment.receiptNumber}:`);
    console.log(`        Machine: ${fetchedPayment.instrument.model} (${fetchedPayment.instrument.instrumentType})`);
    console.log(`        Amount Paid: ₹${fetchedPayment.feeBreakdown.totalAmount} (Status: ${fetchedPayment.status})`);
    console.log(`        Receipt PDF Link: ${fetchedPayment.receiptPdfUrl}`);

    // 5. CLEAN UP TEST RECORDS
    console.log('\n5. Cleaning up temporary test records...');
    await Payment.findByIdAndDelete(payment._id);
    await Application.findByIdAndDelete(application._id);
    await Instrument.findByIdAndDelete(testInstrument._id);
    if (fs.existsSync(fullPdfPath)) {
      fs.unlinkSync(fullPdfPath);
    }
    console.log('   [OK] Cleaned up test records.');

    console.log('\n====================================================');
    console.log(' ALL STATUTORY PAYMENT & RECEIPT CHECKS PASSED! [100%]');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n[FAIL] Error testing payment system:', error);
    process.exit(1);
  }
}

testPaymentSystem();
