// =============================================================================
// MOCK PAYMENT GATEWAY  (backend/src/utils/paymentGateway.js)
// =============================================================================
// Simulates a Razorpay / Stripe payment flow.
//
// In production, replace the internals of each function with the real SDK
// calls — the interface (function signatures and return shape) stays the same
// so the order controller needs zero changes.
//
// Exported functions:
//   initiatePayment(amount, currency, meta)   → { orderId, amount, currency, key }
//   verifyPayment(gatewayOrderId, txnId, sig) → { verified: bool }
//   processPayment(amount, method, meta)      → { success, transactionId, status }
//   initiateRefund(txnId, amount, reason)     → { success, refundId }
// =============================================================================

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const MOCK_GATEWAY_KEY    = 'rzp_test_MOCK_KEY_12345';
const MOCK_GATEWAY_SECRET = 'mock_secret_do_not_use_in_production';

// Simulated failure rate (set to 0 for always-success in dev).
const FAILURE_RATE = 0.05; // 5% chance of payment failure

// Simulated network latency in ms.
const MOCK_LATENCY_MS = 300;

// ---------------------------------------------------------------------------
// HELPER: simulate async network delay
// ---------------------------------------------------------------------------
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// HELPER: generate a deterministic mock transaction ID
// ---------------------------------------------------------------------------
const generateTxnId   = () => `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const generateOrderId = () => `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const generateRefundId= () => `rfnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// EXPORTED 1: initiatePayment
// ---------------------------------------------------------------------------
// Creates a "gateway order" — the first step in a Razorpay-style flow where
// the backend creates the order and passes the orderId to the frontend SDK.
//
// @param {number} amount    - amount in smallest currency unit (paise for INR)
// @param {string} currency  - ISO 4217 code, default 'INR'
// @param {object} meta      - { customerEmail, orderId (internal), notes }
// @returns {{ gatewayOrderId, amount, currency, key, createdAt }}
exports.initiatePayment = async (amount, currency = 'INR', meta = {}) => {
  await delay(MOCK_LATENCY_MS);

  const gatewayOrderId = generateOrderId();

  console.log(`[PaymentGateway] Initiated: ${gatewayOrderId} — ₹${(amount / 100).toFixed(2)}`);

  return {
    success:        true,
    gatewayOrderId,
    amount,       // in paise
    currency,
    key:          MOCK_GATEWAY_KEY,
    description:  meta.notes || 'Food Delivery Order',
    prefill: {
      email: meta.customerEmail || '',
      name:  meta.customerName  || '',
    },
    createdAt: new Date().toISOString(),
  };
};

// ---------------------------------------------------------------------------
// EXPORTED 2: verifyPayment
// ---------------------------------------------------------------------------
// In Razorpay's flow the frontend receives razorpay_payment_id,
// razorpay_order_id, and razorpay_signature after the user pays.
// We verify the HMAC-SHA256 signature on the backend.
//
// Mock: accepts any non-empty string as valid (real: verify HMAC).
//
// @param {string} gatewayOrderId  - from initiatePayment
// @param {string} transactionId   - razorpay_payment_id from frontend
// @param {string} signature       - razorpay_signature from frontend
// @returns {{ verified: bool, transactionId }}
exports.verifyPayment = async (gatewayOrderId, transactionId, signature) => {
  await delay(50); // Verification is fast — no external call needed.

  if (!gatewayOrderId || !transactionId || !signature) {
    return { verified: false, reason: 'Missing payment verification parameters.' };
  }

  // Real implementation:
  //   const body    = `${gatewayOrderId}|${transactionId}`;
  //   const expected = crypto.createHmac('sha256', MOCK_GATEWAY_SECRET)
  //                          .update(body).digest('hex');
  //   return { verified: expected === signature, transactionId };

  // Mock: every well-formed request is considered verified.
  console.log(`[PaymentGateway] Verified payment: ${transactionId}`);
  return { verified: true, transactionId };
};

// ---------------------------------------------------------------------------
// EXPORTED 3: processPayment  (simple one-step charge — used for COD confirm)
// ---------------------------------------------------------------------------
// Combines initiate + verify into a single call.
// Used for COD (Cash On Delivery) to record a ₹0 pending transaction,
// and for mock ONLINE payments where we don't need the redirect flow.
//
// @param {number} amount     - total amount in rupees (NOT paise)
// @param {string} method     - 'COD' | 'ONLINE' | 'UPI' | 'CARD' | 'WALLET'
// @param {object} meta       - { customerEmail, customerName, internalOrderId }
// @returns {{ success, transactionId, gatewayOrderId, status, gatewayResponse }}
exports.processPayment = async (amount, method = 'ONLINE', meta = {}) => {
  await delay(MOCK_LATENCY_MS);

  // COD: no real charge, just record the intent.
  if (method === 'COD') {
    const txnId = generateTxnId();
    console.log(`[PaymentGateway] COD recorded: ${txnId} — ₹${amount.toFixed(2)}`);
    return {
      success:        true,
      transactionId:  txnId,
      gatewayOrderId: null,
      status:         'pending', // payment collected on delivery
      gatewayResponse:{ method: 'COD', amount, currency: 'INR' },
    };
  }

  // Simulate occasional failures for non-COD methods.
  const failed = Math.random() < FAILURE_RATE;
  if (failed) {
    console.warn(`[PaymentGateway] Payment FAILED for ₹${amount.toFixed(2)}`);
    return {
      success:        false,
      transactionId:  null,
      gatewayOrderId: null,
      status:         'failed',
      gatewayResponse:{ error: 'MOCK_PAYMENT_DECLINED', code: 'BAD_REQUEST_ERROR' },
    };
  }

  const txnId  = generateTxnId();
  const gOrdId = generateOrderId();

  console.log(`[PaymentGateway] Charged ₹${amount.toFixed(2)} via ${method}: ${txnId}`);

  return {
    success:        true,
    transactionId:  txnId,
    gatewayOrderId: gOrdId,
    status:         'captured',
    gatewayResponse:{
      method,
      amount,
      currency:    'INR',
      capturedAt:  new Date().toISOString(),
    },
  };
};

// ---------------------------------------------------------------------------
// EXPORTED 4: initiateRefund
// ---------------------------------------------------------------------------
// @param {string} transactionId - original TXN id to refund
// @param {number} amount        - amount to refund (can be partial)
// @param {string} reason        - reason for refund
// @returns {{ success, refundId, status, processedAt }}
exports.initiateRefund = async (transactionId, amount, reason = 'Customer request') => {
  await delay(MOCK_LATENCY_MS);

  if (!transactionId) {
    return { success: false, reason: 'No transaction ID provided.' };
  }

  const refundId = generateRefundId();
  console.log(`[PaymentGateway] Refund ${refundId} — ₹${amount.toFixed(2)} for TXN ${transactionId}`);

  return {
    success:     true,
    refundId,
    status:      'processed',
    amount,
    reason,
    processedAt: new Date().toISOString(),
  };
};
