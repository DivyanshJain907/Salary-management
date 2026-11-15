import { model, models, Schema } from "mongoose";

const payrollRunSchema = new Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
    paymentMethod: { type: String, enum: ["Bank transfer", "UPI", "Cash"], required: true },
    employeeCount: { type: Number, required: true, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    leaveDeduction: { type: Number, required: true, min: 0 },
    advancesPaid: { type: Number, required: true, min: 0 },
    totalPayable: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Processing", "Completed"], default: "Processing" },
  },
  { timestamps: true },
);

export const PayrollRun = models.PayrollRun || model("PayrollRun", payrollRunSchema);
