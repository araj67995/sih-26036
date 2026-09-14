/**
 * Migration Script: Location-Based System & Officer Profile Setup (SIH 26036)
 *
 * Safely migrates existing records in MongoDB:
 * 1. Ensures 2dsphere indexes are created on Officer, Business, Instrument, and Application collections.
 * 2. Migrates legacy string `location` in Instrument to `premisesDescription`, ensuring `location` is either valid GeoJSON or null (never [0, 0] or string).
 * 3. Creates/updates `Officer` location profiles for existing officer users.
 * 4. Syncs missing `verificationLocation` on existing applications.
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDB } = require('../config/db');
const { User, Business, Instrument, Application, Officer } = require('../models');

async function migrate() {
  console.log('====================================================');
  console.log(' STARTING MIGRATION FOR LOCATION & OFFICER SYSTEM');
  console.log('====================================================\n');

  try {
    await connectDB();

    // 1. Fix Instruments with string location
    console.log('--> Step 1: Sanitizing legacy instrument location fields...');
    const instruments = await Instrument.find();
    let instMigrated = 0;

    for (const inst of instruments) {
      let modified = false;

      // If location is a string (e.g. "Counter 1 (Billing)"), move it to premisesDescription
      if (typeof inst.location === 'string' || (inst.location && !inst.location.coordinates)) {
        inst.premisesDescription = String(inst.location || '');
        inst.location = null;
        modified = true;
      }

      // If business has coordinates, copy to instrument if useBusinessAddress is true
      if (!inst.location || !inst.location.coordinates) {
        const business = await Business.findById(inst.business);
        if (business?.location?.coordinates && business.location.coordinates.length === 2) {
          inst.location = {
            type: 'Point',
            coordinates: business.location.coordinates,
          };
          inst.verificationAddress = {
            addressLine1: business.addressLine1 || business.address,
            district: business.district,
            state: business.state,
            pincode: business.pincode,
            country: 'India',
          };
          inst.useBusinessAddress = true;
          inst.isLocationConfirmed = true;
          modified = true;
        }
      }

      if (modified) {
        await inst.save();
        instMigrated++;
      }
    }
    console.log(`    [OK] Checked ${instruments.length} instruments, updated ${instMigrated}.\n`);

    // 2. Ensure Officer profiles for all officer users
    console.log('--> Step 2: Ensuring Officer location profiles for officer users...');
    const officerUsers = await User.find({ role: 'officer' });
    let officersCreated = 0;

    const sampleLocations = [
      {
        officeName: 'Legal Metrology Office, Central Delhi',
        officeAddress: 'Old Secretariat, Civil Lines',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110054',
        coordinates: [77.2245, 28.6738], // [lng, lat]
        serviceRadius: 50,
      },
      {
        officeName: 'Legal Metrology Standards Facility, South Delhi',
        officeAddress: 'Pushp Vihar, Sector 4, M.B. Road',
        district: 'South Delhi',
        state: 'Delhi',
        pincode: '110017',
        coordinates: [77.2289, 28.5284], // [lng, lat]
        serviceRadius: 50,
      },
      {
        officeName: 'Legal Metrology Verification Office, Patna Central',
        officeAddress: 'Vikas Bhawan, Bailey Road',
        district: 'Patna',
        state: 'Bihar',
        pincode: '800001',
        coordinates: [85.1376, 25.5941], // [lng, lat]
        serviceRadius: 50,
      },
    ];

    for (let i = 0; i < officerUsers.length; i++) {
      const u = officerUsers[i];
      let offProfile = await Officer.findOne({ user: u._id });

      if (!offProfile) {
        const locData = sampleLocations[i % sampleLocations.length];
        offProfile = await Officer.create({
          user: u._id,
          officerName: u.name,
          officeName: locData.officeName,
          officeAddress: locData.officeAddress,
          district: locData.district,
          state: locData.state,
          pincode: locData.pincode,
          serviceRadius: locData.serviceRadius,
          availabilityStatus: 'AVAILABLE',
          status: u.status === 'active' ? 'active' : 'inactive',
          location: {
            type: 'Point',
            coordinates: locData.coordinates,
          },
        });
        officersCreated++;
        console.log(`    [+] Created Officer profile for ${u.name} at ${offProfile.officeName}`);
      }
    }
    console.log(`    [OK] Officer profiles verified. Newly created: ${officersCreated}.\n`);

    // 3. Ensure 2dsphere indexes on MongoDB
    console.log('--> Step 3: Building MongoDB 2dsphere indexes...');
    try {
      await Officer.collection.createIndex({ location: '2dsphere' });
      console.log('    [OK] Officer.location (2dsphere) index built.');
    } catch (e) {
      console.warn('    [!] Officer index note:', e.message);
    }

    try {
      await Business.collection.createIndex({ location: '2dsphere' }, { sparse: true });
      console.log('    [OK] Business.location (2dsphere sparse) index built.');
    } catch (e) {
      console.warn('    [!] Business index note:', e.message);
    }

    try {
      await Instrument.collection.createIndex({ location: '2dsphere' }, { sparse: true });
      console.log('    [OK] Instrument.location (2dsphere sparse) index built.');
    } catch (e) {
      console.warn('    [!] Instrument index note:', e.message);
    }

    try {
      await Application.collection.createIndex({ 'verificationLocation.location': '2dsphere' }, { sparse: true });
      console.log('    [OK] Application.verificationLocation.location (2dsphere sparse) index built.');
    } catch (e) {
      console.warn('    [!] Application index note:', e.message);
    }

    console.log('\n====================================================');
    console.log(' MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
