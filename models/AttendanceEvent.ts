import { model, models, Schema } from "mongoose";

const attendanceEventSchema = new Schema(
  {
    employeeId: { type: String, required: true, trim: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "AttendanceBranch", required: true },
    eventType: { type: String, enum: ["check_in", "check_out"], required: true },
    status: { type: String, enum: ["verified", "failed", "inconclusive", "manual_review", "service_unavailable"], required: true },
    occurredAt: { type: Date, required: true },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    accuracyMeters: { type: Number, min: 0, default: null },
    distanceMeters: { type: Number, min: 0, default: null },
    locationStatus: { type: String, enum: ["verified", "outside_geofence", "unavailable", "inaccurate", "not_configured"], required: true },
    verificationId: { type: Schema.Types.ObjectId, ref: "AttendanceVerification", default: null },
    failureReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

attendanceEventSchema.index({ employeeId: 1, eventType: 1, occurredAt: -1 });
attendanceEventSchema.index({ branchId: 1, occurredAt: -1 });

export const AttendanceEvent = models.AttendanceEvent || model("AttendanceEvent", attendanceEventSchema);
