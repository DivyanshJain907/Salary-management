import { model, models, Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Approved", "Pending"], default: "Pending" },
  },
  { timestamps: true },
);

export const Expense = models.Expense || model("Expense", expenseSchema);
