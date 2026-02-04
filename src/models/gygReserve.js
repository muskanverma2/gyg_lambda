const mongoose = require("mongoose");
const { Schema } = mongoose;

const gygReserveSchema = new Schema(
  {
   productId: {
  type: String,
  default: null,
},
    gygBookingReference: {
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
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "gygReserve",
    timestamps: true, 
  }
);

const GygReserve = mongoose.model("GygReserve", gygReserveSchema);

module.exports = GygReserve;
