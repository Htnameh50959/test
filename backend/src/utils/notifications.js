/**
 * Mock Notification Service
 * In production, this would integrate with FCM (Firebase Cloud Messaging),
 * OneSignal, or AWS SNS.
 */

/**
 * Send a push notification to a specific user.
 * @param {string} userId - Recipient user ID
 * @param {object} notification - { title, body, data }
 */
exports.sendPushNotification = async (userId, notification) => {
  console.log(`[Notification] To User ${userId}: ${notification.title} - ${notification.body}`);
  // In a real app, you'd fetch the user's FCM token(s) and send via admin.messaging()
  return { success: true, messageId: `mock_msg_${Date.now()}` };
};

/**
 * Trigger a review prompt for an order.
 * @param {string} userId - Customer ID
 * @param {string} orderId - Order ID
 */
exports.sendReviewPrompt = async (userId, orderId) => {
  console.log(`[Notification] To User ${userId}: Please review your order ${orderId}`);
  return { success: true };
};
