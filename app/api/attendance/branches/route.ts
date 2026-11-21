import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AttendanceBranch } from "@/models/AttendanceBranch";
import { requireAdminSession, validCoordinate } from "@/lib/attendance";
import { Types } from "mongoose";

export const runtime = "nodejs";

const defaultBranch = {
  name: "Main branch",
  timezone: "Asia/Kolkata",
  latitude: null,
  longitude: null,
  radiusMeters: 50,
  shiftStart: "10:00",
  shiftEnd: "19:00",
  gracePeriodMinutes: null,
  halfDayAfterMinutes: null,
  checkoutLivenessRequired: false,
  enabled: true,
};

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;
  try {
    await connectToDatabase();
    const branch = await AttendanceBranch.findOneAndUpdate({}, { $setOnInsert: defaultBranch }, { upsert: true, new: true }).lean();
    return NextResponse.json(branch);
  } catch (error) {
    console.error("Failed to load attendance branch", error);
    return NextResponse.json({ error: "Unable to load attendance branch" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const latitude = body.latitude === null || body.latitude === "" ? null : Number(body.latitude);
    const longitude = body.longitude === null || body.longitude === "" ? null : Number(body.longitude);
    const radiusMeters = Number(body.radiusMeters);
    const shiftStart = typeof body.shiftStart === "string" ? body.shiftStart : "";
    const shiftEnd = typeof body.shiftEnd === "string" ? body.shiftEnd : "";
    const gracePeriodMinutes = body.gracePeriodMinutes === null || body.gracePeriodMinutes === "" ? null : Number(body.gracePeriodMinutes);
    const halfDayAfterMinutes = body.halfDayAfterMinutes === null || body.halfDayAfterMinutes === "" ? null : Number(body.halfDayAfterMinutes);

    if (!name || !timezone || (latitude !== null && !validCoordinate(latitude, -90, 90)) || (longitude !== null && !validCoordinate(longitude, -180, 180)) || (latitude === null) !== (longitude === null) || !Number.isFinite(radiusMeters) || radiusMeters <= 0 || !/^\d{2}:\d{2}$/.test(shiftStart) || !/^\d{2}:\d{2}$/.test(shiftEnd) || (gracePeriodMinutes !== null && (!Number.isInteger(gracePeriodMinutes) || gracePeriodMinutes < 0)) || (halfDayAfterMinutes !== null && (!Number.isInteger(halfDayAfterMinutes) || halfDayAfterMinutes < 0))) {
      return NextResponse.json({ error: "Enter valid branch, coordinate, radius, shift, and policy values" }, { status: 400 });
    }

    await connectToDatabase();
    const branchId = typeof body._id === "string" && Types.ObjectId.isValid(body._id) ? body._id : null;
    const branch = await AttendanceBranch.findOneAndUpdate(
      branchId ? { _id: branchId } : {},
      { name, timezone, latitude, longitude, radiusMeters, shiftStart, shiftEnd, gracePeriodMinutes, halfDayAfterMinutes, checkoutLivenessRequired: body.checkoutLivenessRequired === true, enabled: body.enabled !== false },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    return NextResponse.json(branch);
  } catch (error) {
    console.error("Failed to save attendance branch", error);
    return NextResponse.json({ error: "Unable to save attendance branch" }, { status: 500 });
  }
}
