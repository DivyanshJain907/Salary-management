import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdminSession } from "@/lib/attendance";
import { AttendanceVerification } from "@/models/AttendanceVerification";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;
  try {
    await connectToDatabase();
    const verifications = await AttendanceVerification.find().sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json(verifications);
  } catch (error) {
    console.error("Failed to load attendance verifications", error);
    return NextResponse.json({ error: "Unable to load attendance verifications" }, { status: 500 });
  }
}
