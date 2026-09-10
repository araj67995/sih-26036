const baseUrl = 'http://localhost:5000/api';

async function runE2ETest() {
  console.log('==========================================================');
  console.log(' LEGAL METROLOGY SYSTEM - END-TO-END VERIFICATION TEST');
  console.log('==========================================================\n');

  try {
    // 1. APPLICANT LOGIN
    console.log('1. Testing Applicant Login...');
    const appLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'applicant@demo.com', password: 'Password@123', role: 'applicant' }),
    }).then((r) => r.json());

    if (!appLoginRes.success) throw new Error(`Applicant login failed: ${appLoginRes.message}`);
    const applicantToken = appLoginRes.data.token;
    const applicantHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${applicantToken}`,
    };
    console.log(`   [OK] Applicant authenticated: ${appLoginRes.data.user.name} (${appLoginRes.data.user.email})`);

    // 2. APPLICANT REGISTERS A NEW INSTRUMENT
    console.log('\n2. Testing Instrument Registration by Applicant...');
    const newSerial = `SN-TEST-E2E-${Date.now().toString().slice(-5)}`;
    const instRes = await fetch(`${baseUrl}/instruments`, {
      method: 'POST',
      headers: applicantHeaders,
      body: JSON.stringify({
        instrumentType: 'Electronic Counter Scale',
        manufacturer: 'Essae Precision Systems',
        model: 'DS-450-Plus',
        serialNumber: newSerial,
        capacity: 35,
        unit: 'kg',
        location: 'Front Customer Desk',
      }),
    }).then((r) => r.json());

    if (!instRes.success) throw new Error(`Register instrument failed: ${instRes.message}`);
    const createdInstrument = instRes.data;
    console.log(`   [OK] Registered Instrument: ${createdInstrument.model} (SN: ${createdInstrument.serialNumber}) in MongoDB`);

    // 3. APPLICANT SUBMITS A VERIFICATION APPLICATION
    console.log('\n3. Testing Application Submission by Applicant...');
    const appSubRes = await fetch(`${baseUrl}/applications`, {
      method: 'POST',
      headers: applicantHeaders,
      body: JSON.stringify({
        instrumentId: createdInstrument._id,
        applicationType: 'INITIAL',
        remarks: 'New scale for retail grocery shop billing',
      }),
    }).then((r) => r.json());

    if (!appSubRes.success) throw new Error(`Application submission failed: ${appSubRes.message}`);
    const createdApp = appSubRes.data;
    console.log(`   [OK] Application Submitted: ${createdApp.applicationNumber} (Status: ${createdApp.status})`);

    // 4. OFFICER LOGIN
    console.log('\n4. Testing Legal Metrology Officer Login...');
    const offLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer1@metrology.gov.in', password: 'Officer@123', role: 'officer' }),
    }).then((r) => r.json());

    if (!offLoginRes.success) throw new Error(`Officer login failed: ${offLoginRes.message}`);
    const officerToken = offLoginRes.data.token;
    const officerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    };
    console.log(`   [OK] Officer authenticated: ${offLoginRes.data.user.name}`);

    // 5. OFFICER REVIEWS APPLICATION DOCUMENTS
    console.log('\n5. Officer Reviews Documents & Approves for Inspection...');
    const reviewRes = await fetch(`${baseUrl}/officer/applications/${createdApp._id}/review`, {
      method: 'PUT',
      headers: officerHeaders,
      body: JSON.stringify({
        action: 'APPROVE',
        remarks: 'Purchase invoice and model approval slips approved.',
      }),
    }).then((r) => r.json());

    if (!reviewRes.success) throw new Error(`Review failed: ${reviewRes.message}`);
    console.log(`   [OK] Application status updated to: ${reviewRes.data.status}`);

    // 6. OFFICER SCHEDULES FIELD INSPECTION
    console.log('\n6. Officer Schedules Field Inspection...');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const schedRes = await fetch(`${baseUrl}/officer/applications/${createdApp._id}/schedule`, {
      method: 'PUT',
      headers: officerHeaders,
      body: JSON.stringify({
        inspectionDate: tomorrow,
        remarks: 'On-site verification scheduled with standard Class M1 weights.',
      }),
    }).then((r) => r.json());

    if (!schedRes.success) throw new Error(`Schedule failed: ${schedRes.message}`);
    console.log(`   [OK] Inspection scheduled for: ${tomorrow} (Status: ${schedRes.data.status})`);

    // 7. OFFICER CONDUCTS INSPECTION & PERFORMS ERROR CALCULATION
    console.log('\n7. Officer Records Observations & Automates Error Calculation...');
    const inspectRes = await fetch(`${baseUrl}/inspections`, {
      method: 'POST',
      headers: officerHeaders,
      body: JSON.stringify({
        applicationId: createdApp._id,
        instrumentCondition: 'SATISFACTORY',
        serialNumberVerified: true,
        sealCondition: 'INTACT',
        standardWeight: 20.0,
        observedReading: 20.015,
        permissibleError: 0.05,
        remarks: 'Error is +0.015 kg, well within permissible tolerance of 0.05 kg. Stamped.',
      }),
    }).then((r) => r.json());

    if (!inspectRes.success) throw new Error(`Record inspection failed: ${inspectRes.message}`);
    const calc = inspectRes.data.calculationDetails;
    console.log(`   [OK] Calculated Error: ${calc.error > 0 ? '+' : ''}${calc.error} kg (Limit: ±${calc.permissibleError} kg)`);
    console.log(`   [OK] Automatic Metrology Result: ${calc.result}`);

    // 8. OFFICER APPROVES APPLICATION & GENERATES PDF CERTIFICATE + QR CODE
    console.log('\n8. Officer Approves Application & Generates Certificate...');
    const certGenRes = await fetch(`${baseUrl}/officer/applications/${createdApp._id}/approve`, {
      method: 'POST',
      headers: officerHeaders,
    }).then((r) => r.json());

    if (!certGenRes.success) throw new Error(`Certificate generation failed: ${certGenRes.message}`);
    const generatedCert = certGenRes.data.certificate;
    console.log(`   [OK] Generated Certificate: ${generatedCert.certificateNumber}`);
    console.log(`   [OK] Stored PDF Path: ${generatedCert.pdfUrl}`);

    // 9. PUBLIC VERIFICATION (NO LOGIN / UN-AUTHENTICATED)
    console.log('\n9. Testing Public Verification (Unauthenticated Citizen Query)...');
    const publicVerifyRes = await fetch(`${baseUrl}/verify/${generatedCert.certificateNumber}`).then((r) => r.json());
    if (!publicVerifyRes.success) throw new Error(`Public verification failed: ${publicVerifyRes.message}`);
    const pub = publicVerifyRes.data;
    console.log(`   [OK] Public Result: ${pub.status} (Valid: ${pub.isValid})`);
    console.log(`   [OK] Business Name: ${pub.businessName} (${pub.businessDistrict}, ${pub.businessState})`);
    console.log(`   [OK] Instrument: ${pub.instrument.manufacturer} ${pub.instrument.model} (SN: ${pub.instrument.serialNumber})`);
    console.log(`   [OK] Verified By: ${pub.verifiedBy}`);

    // 10. ADMIN CHECKS DASHBOARD, AUDIT LOGS, AND REPORTS
    console.log('\n10. Testing Admin Dashboard & Audit Logs...');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@metrology.gov.in', password: 'Admin@123', role: 'admin' }),
    }).then((r) => r.json());

    if (!adminLoginRes.success) throw new Error(`Admin login failed: ${adminLoginRes.message}`);
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminLoginRes.data.token}`,
    };

    const [adminDashRes, auditLogsRes] = await Promise.all([
      fetch(`${baseUrl}/admin/dashboard`, { headers: adminHeaders }).then((r) => r.json()),
      fetch(`${baseUrl}/admin/audit-logs?limit=5`, { headers: adminHeaders }).then((r) => r.json()),
    ]);

    if (!adminDashRes.success) throw new Error(`Admin dashboard failed: ${adminDashRes.message}`);
    console.log(`   [OK] Admin Analytics: Total Apps=${adminDashRes.data.totalApplications}, Certificates Issued=${adminDashRes.data.certificatesIssued}`);

    if (!auditLogsRes.success) throw new Error(`Audit logs failed: ${auditLogsRes.message}`);
    console.log(`   [OK] Recent Audit Trail: ${auditLogsRes.data.length} recent logs retrieved. Latest action: "${auditLogsRes.data[0].action}"`);

    console.log('\n==========================================================');
    console.log(' ALL 10 END-TO-END WORKFLOW STAGES PASSED SUCCESSFULLY!');
    console.log('==========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\nE2E Verification Error:', err.message);
    process.exit(1);
  }
}

runE2ETest();
