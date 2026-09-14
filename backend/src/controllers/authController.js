const jwt = require('jsonwebtoken');
const { User, Business, AuditLog } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'supersecret_legal_metrology_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc   Register a new Applicant user and their initial Business establishment
 * @route  POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      businessName,
      businessType,
      address,
      district,
      state,
      pincode,
      gstNumber,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return ApiResponse.error(res, 'An account with this email address already exists', 400);
    }

    // Create User (default role: applicant)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'applicant',
      status: 'active',
    });

    // Create initial Business establishment
    const business = await Business.create({
      owner: user._id,
      businessName: businessName || `${name}'s Commercial Enterprise`,
      businessType: businessType || 'Retailer / Trader',
      address: address || 'Main Commercial Market',
      district: district || 'Central District',
      state: state || 'Delhi',
      pincode: pincode || '110001',
      gstNumber: gstNumber || undefined,
      contactNumber: phone,
      email,
    });

    // Audit log
    await logAction({
      user: user._id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      description: `Applicant ${name} registered with business ${business.businessName}`,
      ipAddress: req.ip,
    });

    const token = generateToken(user._id);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      business: {
        _id: business._id,
        businessName: business.businessName,
        businessType: business.businessType,
      },
    };

    return ApiResponse.success(
      res,
      { user: userData, token },
      'Registration successful. Welcome to Metro Verify.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Authenticate user & obtain JWT token
 * @route  POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'Please provide both email and password', 400);
    }

    // Search user and include select: '+password'
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return ApiResponse.error(res, 'Invalid credentials. User not found.', 401);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid credentials. Password incorrect.', 401);
    }

    // Check account status
    if (user.status !== 'active') {
      return ApiResponse.error(res, `Your account is ${user.status}. Please contact Legal Metrology Admin.`, 403);
    }

    // Role verification (if role was specified in login prompt)
    if (role && user.role !== role) {
      return ApiResponse.error(
        res,
        `Role mismatch. This account is registered as '${user.role}', not '${role}'.`,
        403
      );
    }

    // Fetch primary business if applicant
    let business = null;
    if (user.role === 'applicant') {
      business = await Business.findOne({ owner: user._id });
    }

    const token = generateToken(user._id);

    // Audit log login
    await logAction({
      user: user._id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      description: `${user.name} logged in with role ${user.role}`,
      ipAddress: req.ip,
    });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      business: business
        ? {
            _id: business._id,
            businessName: business.businessName,
            businessType: business.businessType,
          }
        : null,
    };

    return ApiResponse.success(res, { user: userData, token }, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get current authenticated user profile & business info
 * @route  GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let business = null;
    if (user.role === 'applicant') {
      business = await Business.findOne({ owner: user._id });
    }

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      business,
    };

    return ApiResponse.success(res, userData, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
