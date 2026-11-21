import { model, models, Schema } from "mongoose";

const attendanceVerificationSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, trim: true, index: true },
    eventType: { type: String, enum: ["check_in", "check_out"], required: true },
    status: { type: String, enum: ["verified", "failed", "inconclusive", "manual_review", "service_unavailable"], required: true },
    provider: { type: String, required: true, default: "unconfigured" },
    faceMatchStatus: { type: String, enum: ["verified", "failed", "inconclusive", "not_run"], required: true },
    livenessStatus: { type: String, enum: ["verified", "failed", "inconclusive", "not_run"], required: true },
    challenge: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export const AttendanceVerification = models.AttendanceVerification || model("AttendanceVerification", attendanceVerificationSchema);
