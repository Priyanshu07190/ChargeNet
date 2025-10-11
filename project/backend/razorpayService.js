const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in rupees (will be converted to paise)
 * @param {string} currency - Currency code (default: INR)
 * @param {object} receipt - Receipt/booking details
 * @returns {Promise<object>} Razorpay order object
 */
async function createOrder(amount, currency = 'INR', receipt = {}) {
  try {
    // Validate amount
    const rupees = Number(amount);
    if (!Number.isFinite(rupees)) {
      throw new Error('Amount must be a valid number');
    }
    // Convert to paise and ensure integer
    const paise = Math.round(rupees * 100);
    if (paise <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Razorpay receipt must be max 40 chars - use a short unique ID
    const receiptId = `rcpt_${Date.now().toString().slice(-10)}`;
    
    const options = {
      amount: paise, // integer paise (₹1 = 100 paise)
      currency: currency,
      receipt: receiptId, // Short receipt ID (max 40 chars)
      payment_capture: 1, // Auto capture payment
      notes: receipt, // Store full details in notes field instead
    };

    console.log('🧾 Creating Razorpay order with:', options);
    const order = await razorpayInstance.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    return order;
  } catch (error) {
    // Razorpay SDK often returns detailed error structure under error.error
    const reason = error?.error?.description || error?.message || 'Unknown error';
    console.error('❌ Error creating Razorpay order:', reason, '\nFull error:', error);
    // Propagate a concise error for client, preserve detail in message
    const e = new Error(`Failed to create payment order: ${reason}`);
    e.code = 'RAZORPAY_ORDER_FAILED';
    throw e;
  }
}

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} True if signature is valid
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;
    console.log(isValid ? '✅ Payment signature verified' : '❌ Invalid payment signature');
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
async function getPaymentDetails(paymentId) {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
}

/**
 * Initiate a refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund in rupees (optional, full refund if not provided)
 * @returns {Promise<object>} Refund object
 */
async function initiateRefund(paymentId, amount = null) {
  try {
    const options = amount ? { amount: amount * 100 } : {}; // Partial or full refund
    const refund = await razorpayInstance.payments.refund(paymentId, options);
    console.log('✅ Refund initiated:', refund.id);
    return refund;
  } catch (error) {
    console.error('❌ Error initiating refund:', error);
    throw new Error('Failed to initiate refund');
  }
}

module.exports = {
  razorpayInstance,
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  initiateRefund,
};
