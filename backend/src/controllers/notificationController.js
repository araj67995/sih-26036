const { Notification } = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc   Get user notifications
 * @route  GET /api/notifications
 * @access Private
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return ApiResponse.success(res, { notifications, unreadCount }, 'Notifications retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark notification as read
 * @route  PUT /api/notifications/:id/read
 * @access Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    return ApiResponse.success(res, notification, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAsRead };
