const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect routes - Verifies JWT Bearer token and attaches user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(res, 'Not authorized to access this resource. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_legal_metrology_jwt_key_2026');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return ApiResponse.error(res, 'User belonging to this token no longer exists.', 401);
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return ApiResponse.error(res, `Account is ${user.status}. Please contact Legal Metrology administrator.`, 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Invalid or expired authorization token.', 401);
  }
};

/**
 * Grant access to specific roles (e.g. 'admin', 'officer', 'applicant')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Role (${req.user ? req.user.role : 'anonymous'}) is not authorized to access this route`,
        403
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
