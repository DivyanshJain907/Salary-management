import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authCookieName, isValidAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { FaceEnrollment } from "@/models/FaceEnrollment";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAuthToken(cookieStore.get(authCookieName)?.value)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  await connectToDatabase();
  const records = await FaceEnrollment.find().sort({ updatedAt: -1 }).lean();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAuthToken(cookieStore.get(authCookieName)?.value)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const image = typeof body.image === "string" ? body.image : "";
    const consent = body.consent === true;
    const descriptor = Array.isArray(body.descriptor) ? body.descriptor.map(Number).filter(Number.isFinite) : [];
    if (!Types.ObjectId.isValid(employeeId) || !consent) return NextResponse.json({ error: "Select an employee and confirm consent" }, { status: 400 });
    if (descriptor.length !== 128) return NextResponse.json({ error: "No usable face descriptor was detected" }, { status: 400 });

    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image);
    if (!match) return NextResponse.json({ error: "Upload a JPEG, PNG, or WebP image" }, { status: 400 });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length < 10_000 || buffer.length > 5 * 1024 * 1024) return NextResponse.json({ error: "Reference image must be between 10 KB and 5 MB" }, { status: 400 });

    await connectToDatabase();
    const employee = await Employee.findById(employeeId).select("_id").lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const record = await FaceEnrollment.findOneAndUpdate(
      { employeeId },
      {
        employeeId,
        status: "pending_approval",
        consentAt: new Date(),
        approvedAt: null,
        referenceImage: buffer,
        referenceImageMimeType: match[1],
        referenceImageSize: buffer.length,
        referenceDescriptor: descriptor,
      },
      { upsert: true, new: true, runValidators: true },
    ).select("-referenceImage").lean();
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Failed to save face enrollment", error);
    return NextResponse.json({ error: "Unable to save face enrollment" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAuthToken(cookieStore.get(authCookieName)?.value)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const approved = body.approved === true;
    if (!Types.ObjectId.isValid(employeeId)) return NextResponse.json({ error: "A valid employee is required" }, { status: 400 });
    await connectToDatabase();
    const record = await FaceEnrollment.findOneAndUpdate(
      { employeeId },
      approved ? { status: "active", approvedAt: new Date() } : { status: "rejected", approvedAt: null },
      { new: true, runValidators: true },
    ).select("-referenceImage").lean();
    if (!record) return NextResponse.json({ error: "No pending enrollment found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to update face enrollment", error);
    return NextResponse.json({ error: "Unable to update face enrollment" }, { status: 500 });
  }
}
