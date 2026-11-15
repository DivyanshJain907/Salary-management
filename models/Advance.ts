import { deleteModel, model, models, Schema } from "mongoose";

const advanceSchema = new Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    purpose: { type: String, required: true, trim: true },
    method: { type: String, enum: ["Bank transfer", "UPI", "Cash"], default: "Cash" },
    status: { type: String, enum: ["Active", "Settled"], default: "Active" },
  },
  { timestamps: true },
);

if (models.Advance && !models.Advance.schema.path("method")) {
  deleteModel("Advance");
}

export const Advance = models.Advance || model("Advance", advanceSchema);
