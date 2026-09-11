const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instrument',
      required: true,
      index: true,
    },
    applicationType: {
      type: String,
      enum: ['INITIAL', 'RE_VERIFICATION', 'RENEWAL'],
      default: 'INITIAL',
    },
    feeBreakdown: {
      statutoryFee: { type: Number, required: true },
      inspectionFee: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      cgst: { type: Number, required: true },
      sgst: { type: Number, required: true },
      gstRate: { type: Number, default: 18 },
      totalGst: { type: Number, required: true },
      totalAmount: { type: Number, required: true },
      amountInWords: { type: String, default: '' },
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BHARATKOSH_CHALLAN'],
      default: 'UPI',
    },
    paymentGateway: {
      type: String,
      default: 'BharatKosh / Legal Metrology Payment Gateway',
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PAID',
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    receiptPdfUrl: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ applicant: 1, createdAt: -1 });
paymentSchema.index({ business: 1, createdAt: -1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;
