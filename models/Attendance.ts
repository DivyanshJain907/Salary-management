import { model, models, Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["Present", "Absent", "Leave"], required: true },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeName: 1, date: 1 }, { unique: true });

export const Attendance = models.Attendance || model("Attendance", attendanceSchema);
