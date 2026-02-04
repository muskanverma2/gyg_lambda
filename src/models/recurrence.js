const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); 
const { Schema } = mongoose;
const counterSchema = new Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

const recurrenceSchema = new Schema(
  {
    index: {
      type: Number,
      unique: true,
    },
    type: {
      type: String,
      enum: ["FIXED_DATE", "DATE_RANGE", "MONTHLY", "WEEKLY"],
      default: null,
    },
    rule: {
      type: Schema.Types.Mixed,
      default: null,
    },
    recurrenceType: {
      type: String,
      default: "OPEN",
    },
    maxCapacity: {
      type: Number,
      default: null,
    },
    maxCapacityForPickup: {
      type: Number,
      default: null,
    },
    minTotalPax: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Schema.Types.Mixed,
      default: null,
    },
    endDate: {
      type: Schema.Types.Mixed,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    label: {
      type: String,
      default: null,
    },
    affectedStartTimes: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    appliesToAllStartTimes: {
      type: Boolean,
      default: false,
    },
    guidedLanguages: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    bom: {
      type: Schema.Types.Mixed,
      default: null,
    },
    guidedLangs: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    productId: {
    type: String,  
    default: null,
    },
    availabilities: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: Boolean,
      default: true,
    },
    syncId: {
      type: String,
      unique: true,
      default: uuidv4,
    },
  },
  {
    collection: "recurrences",
    timestamps: true,
  }
);


recurrenceSchema.pre("save", async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: "recurrence_index" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.index = counter.seq;
  }
});

const Recurrence = mongoose.model("Recurrence", recurrenceSchema);

module.exports = Recurrence;
