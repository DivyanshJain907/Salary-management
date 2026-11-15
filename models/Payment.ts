import { deleteModel, model, models, Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    method: { type: String, enum: ["Bank transfer", "UPI", "Cash"], required: true },
    reference: { type: String, trim: true, default: "" },
    payrollMonth: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Completed", "Pending"], default: "Completed" },
  },
  { timestamps: true },
);

if (models.Payment && !models.Payment.schema.path("payrollMonth")) {
  deleteModel("Payment");
}

export const Payment = models.Payment || model("Payment", paymentSchema);
