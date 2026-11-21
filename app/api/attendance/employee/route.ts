import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { employeeAuthCookieName, getEmployeeIdFromAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { AttendanceBranch } from "@/models/AttendanceBranch";
import { AttendanceEvent } from "@/models/AttendanceEvent";
import { Employee } from "@/models/Employee";

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

export async function POST() {
  const cookieStore = await cookies();
  if (!getEmployeeIdFromAuthToken(cookieStore.get(employeeAuthCookieName)?.value)) {
    return NextResponse.json({ error: "Employee authentication required" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "An approved face and liveness provider is required before attendance can be recorded" },
    { status: 503 },
  );
}
