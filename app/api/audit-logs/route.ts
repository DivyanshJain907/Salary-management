import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to load audit logs", error);
    return NextResponse.json({ error: "Unable to load audit logs" }, { status: 500 });
  }
}
