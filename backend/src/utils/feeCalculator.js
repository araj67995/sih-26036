/**
 * Legal Metrology Statutory Fee Calculator
 * Calculates statutory verification and stamping fees based on instrument category,
 * rated capacity, unit, and application classification under Legal Metrology Act & Rules.
 */

// Helper to convert number to Indian Rupees words
const numberToWordsRupees = (amount) => {
  const num = Math.round(amount);
  if (num === 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  ];
  const twoDigits = [
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tensMultiple = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  const convertTwoDigits = (n) => {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return twoDigits[n - 10];
    return `${tensMultiple[Math.floor(n / 10)]} ${singleDigits[n % 10]}`.trim();
  };

  const convertThreeDigits = (n) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${singleDigits[hundred]} Hundred `;
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res.trim();
  };

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let hundreds = remainder;

  let words = '';
  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (hundreds > 0) words += `${convertThreeDigits(hundreds)} `;

  return `Rupees ${words.trim()} Only`;
};

/**
 * Calculates itemized verification fees according to machine specifications
 * @param {Object} instrument Instrument object (instrumentType, capacity, unit)
 * @param {string} applicationType 'INITIAL' | 'RENEWAL' | 'RE_VERIFICATION'
 * @returns {Object} Complete fee breakdown
 */
const calculateMachineFee = (instrument, applicationType = 'INITIAL') => {
  const type = instrument?.instrumentType || 'Electronic Counter Scale';
  const capacity = Number(instrument?.capacity) || 0;
  const unit = (instrument?.unit || 'kg').toLowerCase();

  let baseStatutoryFee = 300;
  let machineCategoryDescription = '';

  // Rule-based schedule under Legal Metrology Schedule IX
  if (type === 'Electronic Counter Scale') {
    if (capacity <= 15) {
      baseStatutoryFee = 200;
      machineCategoryDescription = 'Counter Scale (Light Capacity <= 15 kg)';
    } else {
      baseStatutoryFee = 350;
      machineCategoryDescription = 'Counter Scale (Standard Commercial > 15 kg)';
    }
  } else if (type === 'Electronic Platform Scale') {
    if (capacity <= 100) {
      baseStatutoryFee = 500;
      machineCategoryDescription = 'Platform Scale (Medium Capacity <= 100 kg)';
    } else if (capacity <= 300) {
      baseStatutoryFee = 750;
      machineCategoryDescription = 'Platform Scale (Industrial 100 kg - 300 kg)';
    } else {
      baseStatutoryFee = 1000;
      machineCategoryDescription = 'Platform Scale (Heavy Duty > 300 kg)';
    }
  } else if (type === 'Weighbridge / Heavy Capacity Scale') {
    if (unit === 'ton') {
      if (capacity <= 30) {
        baseStatutoryFee = 2500;
        machineCategoryDescription = 'Heavy Weighbridge (Capacity <= 30 Ton)';
      } else if (capacity <= 60) {
        baseStatutoryFee = 3500;
        machineCategoryDescription = 'Heavy Weighbridge (Capacity 30 - 60 Ton)';
      } else {
        baseStatutoryFee = 5000;
        machineCategoryDescription = 'Extra-Heavy Industrial Weighbridge (> 60 Ton)';
      }
    } else {
      baseStatutoryFee = 3000;
      machineCategoryDescription = 'Heavy Duty Weighbridge';
    }
  } else if (type === 'Precision / Analytical Balance (Class I/II)') {
    baseStatutoryFee = 1200;
    machineCategoryDescription = 'High-Precision Analytical Balance (Class I/II Micro-Weighing)';
  } else if (type === 'Fuel Dispensing Unit / Flow Meter') {
    baseStatutoryFee = 1800;
    machineCategoryDescription = 'Fuel Dispenser Flow Meter Unit (Statutory Verification)';
  } else if (type === 'Automatic Weighing Instrument (AWI)') {
    baseStatutoryFee = 1400;
    machineCategoryDescription = 'Automated Continuous Weighing Instrument';
  } else if (type === 'Non-Automatic Weighing Instrument (NAWI)') {
    baseStatutoryFee = 450;
    machineCategoryDescription = 'Standard NAWI Commercial Scale';
  } else if (type === 'Linear Measuring Instrument (Tape/Scale)') {
    baseStatutoryFee = 150;
    machineCategoryDescription = 'Linear Measure (Rigid Scale / Steel Tape)';
  } else if (type === 'Capacity Measure / Storage Tank') {
    baseStatutoryFee = 600;
    machineCategoryDescription = 'Volumetric Capacity Measure / Storage Vessel';
  } else {
    baseStatutoryFee = 400;
    machineCategoryDescription = 'Specialized Measuring Instrument';
  }

  // Application classification adjustment
  let typeMultiplier = 1.0;
  let applicationTypeLabel = 'Initial Verification';
  if (applicationType === 'RE_VERIFICATION') {
    typeMultiplier = 1.25; // Additional post-repair calibration assessment
    applicationTypeLabel = 'Post-Repair Calibration & Verification';
  } else if (applicationType === 'RENEWAL') {
    typeMultiplier = 1.0;
    applicationTypeLabel = 'Periodic Re-verification Renewal';
  }

  const statutoryFee = Math.round(baseStatutoryFee * typeMultiplier);
  // Metrological testing & standard weight handling surcharge
  const inspectionFee = Math.max(100, Math.round(statutoryFee * 0.2));
  const subtotal = statutoryFee + inspectionFee;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const totalAmount = Math.round(subtotal + totalGst);

  return {
    instrumentType: type,
    capacity,
    unit: instrument?.unit || 'kg',
    machineCategoryDescription,
    applicationType,
    applicationTypeLabel,
    statutoryFee,
    inspectionFee,
    subtotal,
    cgst,
    sgst,
    gstRate: 18,
    totalGst,
    totalAmount,
    amountInWords: numberToWordsRupees(totalAmount),
  };
};

module.exports = {
  calculateMachineFee,
  numberToWordsRupees,
};
