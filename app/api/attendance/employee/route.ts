import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { employeeAuthCookieName, getEmployeeIdFromAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { AttendanceBranch } from "@/models/AttendanceBranch";
import { AttendanceEvent } from "@/models/AttendanceEvent";
import { Employee } from "@/models/Employee";
import { AttendanceVerification } from "@/models/AttendanceVerification";
import { FaceEnrollment } from "@/models/FaceEnrollment";
import { haversineDistanceMeters } from "@/lib/attendance";
import { faceVerificationProvider } from "@/lib/attendance-verification";
import { randomUUID } from "crypto";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const employeeId = getEmployeeIdFromAuthToken(cookieStore.get(employeeAuthCookieName)?.value);
  if (!employeeId) return NextResponse.json({ error: "Employee authentication required" }, { status: 401 });
  await connectToDatabase();
  const [employee, branch, events] = await Promise.all([
    Employee.findById(employeeId).select("name role employeeId").lean(),
    AttendanceBranch.findOne({ enabled: true }).lean(),
    AttendanceEvent.find({ employeeId }).sort({ occurredAt: -1 }).limit(20).lean(),
  ]);
  return NextResponse.json({ employeeId, employee, branch, events });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const employeeId = getEmployeeIdFromAuthToken(cookieStore.get(employeeAuthCookieName)?.value);
  if (!employeeId) {
    return NextResponse.json({ error: "Employee authentication required" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const body = await request.json();
    const eventType = body.eventType === "check_out" ? "check_out" : "check_in";
    const latitude = typeof body.latitude === "number" ? body.latitude : NaN;
    const longitude = typeof body.longitude === "number" ? body.longitude : NaN;
    const accuracyMeters = typeof body.accuracyMeters === "number" ? body.accuracyMeters : null;
    const selfie = typeof body.selfie === "string" ? body.selfie : "";
    const challenge = typeof body.challenge === "string" ? body.challenge : "";
    const selfieDescriptor = Array.isArray(body.selfieDescriptor)
      ? body.selfieDescriptor.map(Number).filter(Number.isFinite)
      : [];
    if (selfieDescriptor.length !== 128) return NextResponse.json({ error: "No usable face was detected in the selfie" }, { status: 400 });
    const selfieMatch = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(selfie);
    if (!selfieMatch) return NextResponse.json({ error: "A fresh selfie capture is required" }, { status: 400 });
    const selfieBuffer = Buffer.from(selfieMatch[2], "base64");
    if (selfieBuffer.length < 10_000 || selfieBuffer.length > 5 * 1024 * 1024) return NextResponse.json({ error: "Selfie image is missing or too large" }, { status: 400 });

    const branch = await AttendanceBranch.findOne({ enabled: true }).lean<{
      _id: Types.ObjectId;
      latitude: number | null;
      longitude: number | null;
      radiusMeters: number;
    } | null>();
    if (!branch) return NextResponse.json({ error: "No enabled attendance branch is configured" }, { status: 400 });

    let locationStatus: "verified" | "outside_geofence" | "unavailable" | "inaccurate" | "not_configured";
    let distanceMeters: number | null = null;
    if (branch.latitude === null || branch.longitude === null) {
      locationStatus = "not_configured";
    } else if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      locationStatus = "unavailable";
    } else if (accuracyMeters !== null && accuracyMeters > 100) {
      locationStatus = "inaccurate";
    } else {
      distanceMeters = haversineDistanceMeters(latitude, longitude, branch.latitude, branch.longitude);
      locationStatus = distanceMeters <= branch.radiusMeters ? "verified" : "outside_geofence";
    }

    if (locationStatus !== "verified") {
      const failureReason = locationStatus === "outside_geofence"
        ? `Outside branch geofence (${Math.round(distanceMeters || 0)}m)`
        : `Location ${locationStatus}`;
      const verification = await AttendanceVerification.create({
        sessionId: randomUUID(),
        employeeId,
        eventType,
        status: "failed",
        provider: "backend-gps",
        faceMatchStatus: "not_run",
        livenessStatus: "not_run",
        reason: failureReason,
      });
      await AttendanceEvent.create({
        employeeId,
        branchId: branch._id,
        eventType,
        status: "failed",
        occurredAt: new Date(),
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        accuracyMeters,
        distanceMeters,
        locationStatus,
        verificationId: verification._id,
        failureReason,
      });
      return NextResponse.json({ status: "failed", locationStatus, distanceMeters, error: failureReason }, { status: 422 });
    }

    if (eventType === "check_in") {
      const latestCheckIn = await AttendanceEvent.findOne({ employeeId, eventType: "check_in", status: "verified", occurredAt: { $gt: new Date(Date.now() - 20 * 60 * 60 * 1000) } }).lean();
      if (latestCheckIn) return NextResponse.json({ error: "A verified check-in already exists recently" }, { status: 409 });
    }

    const enrollment = await FaceEnrollment.findOne({ employeeId, status: "active" }).select("+referenceImage referenceImageMimeType +referenceDescriptor").lean<{ referenceImage?: Buffer; referenceImageMimeType?: string; referenceDescriptor?: number[] }>();
    if (!enrollment?.referenceImage || !enrollment.referenceDescriptor || enrollment.referenceDescriptor.length !== 128) {
      const verification = await AttendanceVerification.create({
        sessionId: randomUUID(),
        employeeId,
        eventType,
        status: "manual_review",
        provider: "unconfigured",
        faceMatchStatus: "not_run",
        livenessStatus: "not_run",
        reason: "Active approved employee reference photo is missing",
      });
      await AttendanceEvent.create({
        employeeId,
        branchId: branch._id,
        eventType,
        status: "manual_review",
        occurredAt: new Date(),
        latitude,
        longitude,
        accuracyMeters,
        distanceMeters,
        locationStatus,
        verificationId: verification._id,
        failureReason: verification.reason,
      });
      return NextResponse.json({ status: "manual_review", error: verification.reason }, { status: 422 });
    }

    const referenceImage = `data:${enrollment.referenceImageMimeType || "image/jpeg"};base64,${enrollment.referenceImage.toString("base64")}`;
    const verificationSessionId = randomUUID();
    const result = await faceVerificationProvider.verify({
      employeeId,
      eventType,
      sessionId: verificationSessionId,
      selfie,
      challenge,
      referenceImage,
      selfieDescriptor,
      referenceDescriptor: enrollment.referenceDescriptor,
    });
    const verification = await AttendanceVerification.create({
      sessionId: verificationSessionId,
      employeeId,
      eventType,
      status: result.status,
      provider: result.provider,
      faceMatchStatus: result.faceMatchStatus,
      livenessStatus: result.livenessStatus,
      challenge,
      reason: result.reason,
    });
    await AttendanceEvent.create({
      employeeId,
      branchId: branch._id,
      eventType,
      status: result.status,
      occurredAt: new Date(),
      latitude,
      longitude,
      accuracyMeters,
      distanceMeters,
      locationStatus,
      verificationId: verification._id,
      failureReason: result.reason,
    });
    if (result.status !== "verified") return NextResponse.json({ status: result.status, reason: result.reason }, { status: 422 });
    return NextResponse.json({ status: "verified", distanceMeters, verificationId: verification._id });
  } catch (error) {
    console.error("Failed to record attendance", error);
    return NextResponse.json({ error: "Unable to record attendance" }, { status: 500 });
  }
}
