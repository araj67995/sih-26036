/**
 * Officer Allocation Service (SIH 26036)
 *
 * Implements automated nearest Legal Metrology Officer allocation using
 * MongoDB geospatial $geoNear queries, distance verification against
 * officer service radius, availability checks, audit trail logging,
 * and multi-stakeholder notifications.
 */

const mongoose = require('mongoose');
const { Application, Instrument, Business, Officer, User, AuditLog, Notification } = require('../models');
const { logAction } = require('./auditService');

/**
 * Helper to calculate haversine distance in meters between two GeoJSON points [lng1, lat1] and [lng2, lat2]
 * Used for in-memory verification or manual distance recalculation
 */
const calculateHaversineDistance = (coords1, coords2) => {
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;

  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Format distance in meters to a human-readable string (e.g. "7.4 km")
 */
const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return 'N/A';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Extract verification location from application, instrument, or business
 */
const resolveVerificationLocation = async (application) => {
  // 1. Check if application already has a snapshot of verificationLocation with valid coordinates
  if (
    application.verificationLocation?.location?.coordinates &&
    application.verificationLocation.location.coordinates.length === 2 &&
    !(
      application.verificationLocation.location.coordinates[0] === 0 &&
      application.verificationLocation.location.coordinates[1] === 0
    )
  ) {
    return {
      coordinates: application.verificationLocation.location.coordinates,
      address: application.verificationLocation,
      source: 'application',
    };
  }

  // 2. Check Instrument's location
  let instrument = null;
  if (application.instrument && application.instrument._id) {
    instrument = application.instrument;
  } else if (application.instrument) {
    instrument = await Instrument.findById(application.instrument);
  }

  if (
    instrument?.location?.coordinates &&
    instrument.location.coordinates.length === 2 &&
    !(instrument.location.coordinates[0] === 0 && instrument.location.coordinates[1] === 0)
  ) {
    return {
      coordinates: instrument.location.coordinates,
      address: instrument.verificationAddress || {},
      source: 'instrument',
    };
  }

  // 3. Fallback to Business's location
  let business = null;
  if (application.business && application.business._id) {
    business = application.business;
  } else if (application.business) {
    business = await Business.findById(application.business);
  }

  if (
    business?.location?.coordinates &&
    business.location.coordinates.length === 2 &&
    !(business.location.coordinates[0] === 0 && business.location.coordinates[1] === 0)
  ) {
    return {
      coordinates: business.location.coordinates,
      address: {
        addressLine1: business.addressLine1 || business.address,
        addressLine2: business.addressLine2,
        locality: business.locality,
        landmark: business.landmark,
        city: business.city,
        district: business.district,
        state: business.state,
        pincode: business.pincode,
        country: business.country || 'India',
      },
      source: 'business',
    };
  }

  return null;
};

/**
 * Synchronize verificationLocation snapshot to Application document
 */
const syncApplicationLocationSnapshot = async (application, resolved) => {
  if (!resolved) return;

  application.verificationLocation = {
    addressLine1: resolved.address.addressLine1 || '',
    addressLine2: resolved.address.addressLine2 || '',
    locality: resolved.address.locality || '',
    landmark: resolved.address.landmark || '',
    city: resolved.address.city || '',
    district: resolved.address.district || '',
    state: resolved.address.state || '',
    country: resolved.address.country || 'India',
    pincode: resolved.address.pincode || '',
    formattedAddress:
      resolved.address.formattedAddress ||
      [
        resolved.address.addressLine1,
        resolved.address.locality,
        resolved.address.city,
        resolved.address.district,
        resolved.address.state,
        resolved.address.pincode,
      ]
        .filter(Boolean)
        .join(', '),
    location: {
      type: 'Point',
      coordinates: resolved.coordinates,
    },
  };
};

/**
 * Find eligible officers ranked by distance using MongoDB $geoNear
 */
const findEligibleOfficers = async (coordinates, maxDistanceMeters = 500000) => {
  const [lng, lat] = coordinates;

  // MongoDB $geoNear aggregation
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'calculatedDistance', // Distance in meters
        spherical: true,
        maxDistance: maxDistanceMeters,
        query: {
          status: 'active',
          availabilityStatus: 'AVAILABLE',
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $unwind: '$userDetails',
    },
    // Filter active user accounts
    {
      $match: {
        'userDetails.status': 'active',
      },
    },
    // Match only officers within their configured service radius
    {
      $addFields: {
        maxAllowedRadiusMeters: { $multiply: ['$serviceRadius', 1000] },
      },
    },
    {
      $addFields: {
        isWithinServiceRadius: {
          $lte: ['$calculatedDistance', '$maxAllowedRadiusMeters'],
        },
      },
    },
    {
      $sort: { calculatedDistance: 1 },
    },
  ];

  return await Officer.aggregate(pipeline);
};

/**
 * Core Algorithm: Allocate nearest Legal Metrology Officer to an Application
 *
 * @param {string|ObjectId} applicationId
 * @returns {Promise<object>} Allocation outcome
 */
const allocateNearestOfficer = async (applicationId) => {
  const application = await Application.findById(applicationId)
    .populate('instrument')
    .populate('business')
    .populate('applicant');

  if (!application) {
    throw new Error('Application not found');
  }

  // 1. Resolve verification location
  const resolvedLoc = await resolveVerificationLocation(application);

  // If no coordinates exist (e.g. old record or applicant hasn't confirmed location yet)
  if (!resolvedLoc || !resolvedLoc.coordinates || resolvedLoc.coordinates.length !== 2) {
    application.assignedOfficer = null;
    application.assignedOfficerProfile = null;
    application.allocationStatus = 'LOCATION_REQUIRED';
    application.allocationMethod = null;
    application.allocationDistance = null;
    await application.save();

    return {
      success: false,
      status: 'LOCATION_REQUIRED',
      message:
        'Physical verification location coordinates are required before officer allocation can proceed. Please update the instrument verification location.',
      application,
    };
  }

  // Ensure application has latest verificationLocation snapshot
  await syncApplicationLocationSnapshot(application, resolvedLoc);

  // 2. Find eligible officers ranked by distance
  const eligibleOfficers = await findEligibleOfficers(resolvedLoc.coordinates);

  // 3. Filter officers strictly within their service radius
  const eligibleWithinRadius = eligibleOfficers.filter((o) => o.isWithinServiceRadius);

  // 4. Select nearest officer
  if (eligibleWithinRadius.length > 0) {
    const selectedOfficer = eligibleWithinRadius[0];
    const prevOfficer = application.assignedOfficer;

    application.assignedOfficer = selectedOfficer.user;
    application.assignedOfficerProfile = selectedOfficer._id;
    application.allocationDistance = Math.round(selectedOfficer.calculatedDistance);
    application.allocationMethod = 'AUTO_NEAREST';
    application.allocationStatus = 'ALLOCATED';
    application.allocatedAt = new Date();

    await application.save();

    // 5. Create Audit Log
    await logAction({
      user: null, // System automated action
      action: 'AUTOMATIC_OFFICER_ALLOCATION',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: prevOfficer ? 'REALLOCATED' : 'WAITING_FOR_ALLOCATION',
      newStatus: 'ALLOCATED',
      description: `Automatically allocated to nearest officer ${selectedOfficer.officerName} (${selectedOfficer.officeName}) at distance ${formatDistance(
        selectedOfficer.calculatedDistance
      )}`,
    });

    // 6. Notifications
    try {
      // Notify Assigned Officer
      await Notification.create({
        user: selectedOfficer.user,
        recipient: selectedOfficer.user,
        title: 'New Verification Application Assigned',
        message: `New verification application ${application.applicationNumber} has been automatically allocated to you (${formatDistance(
          selectedOfficer.calculatedDistance
        )} from your office).`,
        type: 'OFFICER_ALLOCATED',
        relatedEntity: {
          entityType: 'Application',
          entityId: application._id,
        },
      });

      // Notify Applicant
      if (application.applicant) {
        const applicantId = application.applicant._id || application.applicant;
        await Notification.create({
          user: applicantId,
          recipient: applicantId,
          title: 'Legal Metrology Officer Assigned',
          message: `Your application ${application.applicationNumber} has been assigned to Legal Metrology Officer ${selectedOfficer.officerName} (${selectedOfficer.officeName}).`,
          type: 'OFFICER_ALLOCATED',
          relatedEntity: {
            entityType: 'Application',
            entityId: application._id,
          },
        });
      }
    } catch (notifErr) {
      console.warn('[Notification warning during auto-allocation]:', notifErr.message);
    }

    return {
      success: true,
      status: 'ALLOCATED',
      message: `Successfully allocated to nearest officer ${selectedOfficer.officerName}`,
      assignedOfficer: selectedOfficer,
      distance: selectedOfficer.calculatedDistance,
      distanceFormatted: formatDistance(selectedOfficer.calculatedDistance),
      application,
    };
  }

  // 5. No eligible officer available within service radius
  application.assignedOfficer = null;
  application.assignedOfficerProfile = null;
  application.allocationStatus = 'WAITING_FOR_ALLOCATION';
  application.allocationMethod = null;
  application.allocationDistance = null;
  await application.save();

  // Notify Administrators
  try {
    const admins = await User.find({ role: 'admin', status: 'active' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        recipient: admin._id,
        title: 'Application Waiting for Officer Allocation',
        message: `Application ${application.applicationNumber} has no eligible Legal Metrology Officer within active service radius. Manual intervention required.`,
        type: 'WAITING_FOR_ALLOCATION',
        relatedEntity: {
          entityType: 'Application',
          entityId: application._id,
        },
      });
    }
  } catch (notifErr) {
    console.warn('[Notification warning for admins]:', notifErr.message);
  }

  return {
    success: false,
    status: 'WAITING_FOR_ALLOCATION',
    message:
      'No eligible Legal Metrology Officer is currently available within service radius. Application status set to WAITING_FOR_ALLOCATION.',
    application,
  };
};

/**
 * Manual Officer Reassignment by Administrator
 */
const reassignOfficerManually = async ({ applicationId, officerUserId, reason, adminUserId }) => {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Please provide a mandatory reason for manual officer reassignment (at least 5 characters)');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error('Application not found');
  }

  const officerUser = await User.findOne({ _id: officerUserId, role: 'officer' });
  if (!officerUser) {
    throw new Error('Designated officer not found or is not an active Legal Metrology Officer');
  }

  const officerProfile = await Officer.findOne({ user: officerUser._id });

  // Calculate distance if both locations exist
  let calculatedDistance = null;
  const resolvedLoc = await resolveVerificationLocation(application);

  if (resolvedLoc?.coordinates && officerProfile?.location?.coordinates) {
    calculatedDistance = calculateHaversineDistance(
      resolvedLoc.coordinates,
      officerProfile.location.coordinates
    );
  }

  const oldOfficer = application.assignedOfficer;

  // Update application
  application.assignedOfficer = officerUser._id;
  if (officerProfile) {
    application.assignedOfficerProfile = officerProfile._id;
  }
  application.allocationMethod = 'MANUAL';
  application.allocationStatus = 'ALLOCATED';
  application.allocationDistance = calculatedDistance;
  application.allocatedAt = new Date();

  // Record reassignment history
  application.reassignmentHistory.push({
    oldOfficer: oldOfficer || null,
    newOfficer: officerUser._id,
    reason: reason.trim(),
    admin: adminUserId,
    timestamp: new Date(),
  });

  await application.save();

  // Audit log
  await logAction({
    user: adminUserId,
    action: 'MANUAL_OFFICER_REASSIGNMENT',
    entityType: 'Application',
    entityId: application._id,
    previousStatus: oldOfficer ? 'REASSIGNED' : 'WAITING_FOR_ALLOCATION',
    newStatus: 'ALLOCATED',
    description: `Admin manually reassigned application ${application.applicationNumber} to Officer ${
      officerUser.name
    }. Reason: ${reason.trim()}. Distance: ${formatDistance(calculatedDistance)}`,
  });

  // Notifications
  try {
    // Notify newly assigned officer
    await Notification.create({
      user: officerUser._id,
      recipient: officerUser._id,
      title: 'Application Manually Reassigned to You',
      message: `Application ${application.applicationNumber} was manually reassigned to you by Administrator. Reason: ${reason.trim()}`,
      type: 'MANUAL_REASSIGNMENT',
      relatedEntity: {
        entityType: 'Application',
        entityId: application._id,
      },
    });

    // Notify applicant
    if (application.applicant) {
      await Notification.create({
        user: application.applicant,
        recipient: application.applicant,
        title: 'Officer Allocation Updated',
        message: `Your application ${application.applicationNumber} has been reassigned to Officer ${officerUser.name}.`,
        type: 'MANUAL_REASSIGNMENT',
        relatedEntity: {
          entityType: 'Application',
          entityId: application._id,
        },
      });
    }
  } catch (notifErr) {
    console.warn('[Notification warning during manual reassignment]:', notifErr.message);
  }

  return {
    success: true,
    application,
    officer: officerUser,
    distance: calculatedDistance,
    distanceFormatted: formatDistance(calculatedDistance),
  };
};

/**
 * Get all officers with calculated distances to an application's verification location
 * Used in Admin Reallocation modal
 */
const getEligibleOfficersForApplication = async (applicationId) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error('Application not found');
  }

  const resolvedLoc = await resolveVerificationLocation(application);
  const officers = await Officer.find().populate('user', 'name email phone status');

  const officerList = officers.map((off) => {
    let distance = null;
    let isWithinServiceArea = false;

    if (resolvedLoc?.coordinates && off.location?.coordinates) {
      distance = calculateHaversineDistance(resolvedLoc.coordinates, off.location.coordinates);
      isWithinServiceArea = distance <= off.serviceRadius * 1000;
    }

    return {
      _id: off._id,
      userId: off.user?._id,
      name: off.officerName || off.user?.name,
      email: off.user?.email,
      phone: off.user?.phone,
      officeName: off.officeName,
      officeAddress: off.officeAddress,
      district: off.district,
      state: off.state,
      serviceRadius: off.serviceRadius,
      availabilityStatus: off.availabilityStatus,
      status: off.status,
      userStatus: off.user?.status,
      distance,
      distanceFormatted: formatDistance(distance),
      isWithinServiceArea,
      isAvailable: off.availabilityStatus === 'AVAILABLE' && off.status === 'active' && off.user?.status === 'active',
      isCurrentlyAssigned:
        application.assignedOfficer?.toString() === off.user?._id?.toString() ||
        application.assignedOfficerProfile?.toString() === off._id?.toString(),
    };
  });

  // Sort by distance (nulls last)
  officerList.sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  return {
    applicationNumber: application.applicationNumber,
    verificationLocation: resolvedLoc,
    officers: officerList,
  };
};

module.exports = {
  allocateNearestOfficer,
  reassignOfficerManually,
  getEligibleOfficersForApplication,
  calculateHaversineDistance,
  formatDistance,
  resolveVerificationLocation,
};
