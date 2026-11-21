export type VerificationStatus = "verified" | "failed" | "inconclusive" | "manual_review" | "service_unavailable";

export type VerificationInput = {
  employeeId: string;
  eventType: "check_in" | "check_out";
  sessionId: string;
};

export type VerificationResult = {
  status: VerificationStatus;
  provider: string;
  faceMatchStatus: "verified" | "failed" | "inconclusive" | "not_run";
  livenessStatus: "verified" | "failed" | "inconclusive" | "not_run";
  reason: string;
};

export interface FaceVerificationProvider {
  verify(input: VerificationInput): Promise<VerificationResult>;
}

/**
 * No provider is enabled until its code, weights, dependencies, and commercial
 * terms have been reviewed. This deliberately fails closed rather than
 * pretending that face matching or liveness succeeded.
 */
export class UnconfiguredFaceVerificationProvider implements FaceVerificationProvider {
  async verify(): Promise<VerificationResult> {
    return {
      status: "service_unavailable",
      provider: "unconfigured",
      faceMatchStatus: "not_run",
      livenessStatus: "not_run",
      reason: "No commercially approved face verification provider is configured",
    };
  }
}

export const faceVerificationProvider: FaceVerificationProvider = new UnconfiguredFaceVerificationProvider();
