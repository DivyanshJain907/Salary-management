import { deleteModel, model, models, Schema } from "mongoose";

const faceEnrollmentSchema = new Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["pending_consent", "pending_approval", "active", "rejected", "revoked"], required: true, default: "pending_consent" },
    consentAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    referenceImage: { type: Buffer, select: false, default: null },
    referenceImageMimeType: { type: String, trim: true, default: "" },
    referenceImageSize: { type: Number, min: 0, default: 0 },
    referenceDescriptor: { type: [Number], select: false, default: null },
    provider: { type: String, default: "unconfigured" },
    representationCiphertext: { type: String, select: false, default: null },
  },
  { timestamps: true },
);

if (models.FaceEnrollment && !models.FaceEnrollment.schema.path("referenceImage")) deleteModel("FaceEnrollment");

export const FaceEnrollment = models.FaceEnrollment || model("FaceEnrollment", faceEnrollmentSchema);
