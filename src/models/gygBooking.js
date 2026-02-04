const mongoose = require("mongoose");
const { Schema } = mongoose;

const gygBookingSchema = new Schema(
  {
  productId: {
  type: String,
  default: null,
},
    reservationReference: {
      type: String,
      default: null,
    },
    gygBookingReference: {
      type: String,
      default: null,
    },
    bookingReference: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: null,
    },
    dateTime: {
      type: Date,
      default: null,
    },
    bookingItems: {
      type: Schema.Types.Mixed,
      default: null,
    },
    tickets: {
      type: Schema.Types.Mixed,
      default: null,
    },
    travelers: {
      type: Schema.Types.Mixed,
      default: null,
    },
    travelerHotel: {
      type: String,
      default: null,
    },
    comment: {
      type: String,
      default: null,
    },
    bookingStatus: {
      type: String,
      default: "confirmed",
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "gygBooking",
    timestamps: true, 
  }
);

const GygBooking = mongoose.model("GygBooking", gygBookingSchema);

module.exports = GygBooking;
