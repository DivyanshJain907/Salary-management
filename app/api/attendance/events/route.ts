import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdminSession } from "@/lib/attendance";
import { AttendanceEvent } from "@/models/AttendanceEvent";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;
  try {
    await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const employeeId = params.get("employeeId")?.trim();
    const status = params.get("status")?.trim();
    const query: Record<string, string> = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    const events = await AttendanceEvent.find(query).sort({ occurredAt: -1 }).limit(200).lean();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to load attendance events", error);
    return NextResponse.json({ error: "Unable to load attendance events" }, { status: 500 });
  }
}
