export type VerificationStatus = "verified" | "failed" | "inconclusive" | "manual_review" | "service_unavailable";

export type VerificationInput = {
  employeeId: string;
  eventType: "check_in" | "check_out";
  sessionId: string;
  selfie: string;
  challenge: string;
  referenceImage?: string;
  selfieDescriptor?: number[];
  referenceDescriptor?: number[];
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

export class HttpFaceVerificationProvider implements FaceVerificationProvider {
  constructor(private readonly endpoint: string, private readonly apiKey: string) {}

  async verify(input: VerificationInput): Promise<VerificationResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      const result = await response.json();
      if (!["verified", "failed", "inconclusive", "manual_review"].includes(result.status)) {
        throw new Error("Provider returned an invalid status");
      }
      return {
        status: result.status,
        provider: "licensed-http-provider",
        faceMatchStatus: ["verified", "failed", "inconclusive"].includes(result.faceMatchStatus) ? result.faceMatchStatus : "not_run",
        livenessStatus: ["verified", "failed", "inconclusive"].includes(result.livenessStatus) ? result.livenessStatus : "not_run",
        reason: typeof result.reason === "string" ? result.reason : "",
      };
    } catch (error) {
      return {
        status: "service_unavailable",
        provider: "licensed-http-provider",
        faceMatchStatus: "not_run",
        livenessStatus: "not_run",
        reason: error instanceof Error ? error.message : "Verification provider unavailable",
      };
    }
  }
}

export class LocalFaceMatchingProvider implements FaceVerificationProvider {
  async verify(input: VerificationInput): Promise<VerificationResult> {
    const selfie = input.selfieDescriptor;
    const reference = input.referenceDescriptor;
    if (!selfie || !reference || selfie.length !== 128 || reference.length !== 128) {
      return {
        status: "inconclusive",
        provider: "face-api-local",
        faceMatchStatus: "inconclusive",
        livenessStatus: "not_run",
        reason: "A complete face descriptor was not available",
      };
    }

    let dot = 0;
    let selfieMagnitude = 0;
    let referenceMagnitude = 0;
    for (let index = 0; index < selfie.length; index += 1) {
      dot += selfie[index] * reference[index];
      selfieMagnitude += selfie[index] ** 2;
      referenceMagnitude += reference[index] ** 2;
    }
    const similarity = dot / (Math.sqrt(selfieMagnitude) * Math.sqrt(referenceMagnitude));
    const threshold = Number(process.env.FACE_MATCH_THRESHOLD || 0.55);
    if (similarity >= threshold) {
      return {
        status: "verified",
        provider: "face-api-local",
        faceMatchStatus: "verified",
        livenessStatus: "not_run",
        reason: `Face similarity ${similarity.toFixed(3)} met the configured threshold`,
      };
    }
    return {
      status: "failed",
      provider: "face-api-local",
      faceMatchStatus: "failed",
      livenessStatus: "not_run",
      reason: `Face similarity ${similarity.toFixed(3)} was below the configured threshold`,
    };
  }
}

export const faceVerificationProvider: FaceVerificationProvider =
  process.env.FACE_VERIFICATION_ENDPOINT && process.env.FACE_VERIFICATION_API_KEY
    ? new HttpFaceVerificationProvider(process.env.FACE_VERIFICATION_ENDPOINT, process.env.FACE_VERIFICATION_API_KEY)
    : new LocalFaceMatchingProvider();
