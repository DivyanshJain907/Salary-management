import { model, models, Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    actor: { type: String, default: "Divyansh Jain" },
  },
  { timestamps: true },
);

export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
