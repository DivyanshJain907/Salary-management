import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const records = await Attendance.find().sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to load attendance", error);
    return NextResponse.json({ error: "Unable to load attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeName = typeof body.employeeName === "string" ? body.employeeName.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const status = body.status;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!employeeName || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["Present", "Absent", "Leave"].includes(status)) {
      return NextResponse.json({ error: "Employee, date, and attendance status are required" }, { status: 400 });
    }

    await connectToDatabase();
    const record = await Attendance.create({ employeeName, date, status, note });
    return NextResponse.json(record, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Attendance is already recorded for this employee and date" }, { status: 409 });
    }
    console.error("Failed to record attendance", error);
    return NextResponse.json({ error: "Unable to record attendance" }, { status: 500 });
  }
}
