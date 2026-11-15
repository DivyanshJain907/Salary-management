import { model, models, Schema } from "mongoose";

const settingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "company" },
    companyName: { type: String, required: true, default: "Jain Sales Corporation" },
    adminEmail: { type: String, required: true, default: "" },
    currency: { type: String, required: true, default: "INR" },
    payrollDay: { type: Number, required: true, min: 1, max: 31, default: 30 },
  },
  { timestamps: true },
);

export const Settings = models.Settings || model("Settings", settingsSchema);
