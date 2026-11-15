import { deleteModel, model, models, Schema } from "mongoose";

const employeeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    whatsappOptIn: { type: Boolean, default: false },
    salary: { type: Number, required: true, min: 0 },
    joiningDate: { type: String, trim: true, default: "" },
    totalLeaveAllowance: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["Paid", "Pending", "Partial"], default: "Pending" },
  },
  { timestamps: true },
);

if (models.Employee && !models.Employee.schema.path("phone")) {
  deleteModel("Employee");
}

export const Employee = models.Employee || model("Employee", employeeSchema);
