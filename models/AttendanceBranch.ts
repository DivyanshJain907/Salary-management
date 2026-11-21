import { model, models, Schema } from "mongoose";

const attendanceBranchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    radiusMeters: { type: Number, required: true, min: 1, default: 50 },
    shiftStart: { type: String, required: true, default: "10:00" },
    shiftEnd: { type: String, required: true, default: "19:00" },
    gracePeriodMinutes: { type: Number, min: 0, default: null },
    halfDayAfterMinutes: { type: Number, min: 0, default: null },
    checkoutLivenessRequired: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

attendanceBranchSchema.index({ name: 1 }, { unique: true });

export const AttendanceBranch = models.AttendanceBranch || model("AttendanceBranch", attendanceBranchSchema);
