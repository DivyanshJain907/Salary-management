import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Advance } from "@/models/Advance";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const advances = await Advance.find().sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return NextResponse.json(advances);
  } catch (error) {
    console.error("Failed to load advances", error);
    return NextResponse.json({ error: "Unable to load advances" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeName = typeof body.employeeName === "string" ? body.employeeName.trim() : "";
    const amount = Number(body.amount);
    const date = typeof body.date === "string" ? body.date : "";
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
    const method = body.method;

    if (!employeeName || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !purpose || !["Bank transfer", "UPI", "Cash"].includes(method)) {
      return NextResponse.json({ error: "Employee, amount, date, purpose, and payment method are required" }, { status: 400 });
    }

    await connectToDatabase();
    const advance = await Advance.create({ employeeName, amount, date, purpose, method, status: "Active" });
    return NextResponse.json(advance, { status: 201 });
  } catch (error) {
    console.error("Failed to create advance", error);
    return NextResponse.json({ error: "Unable to create advance" }, { status: 500 });
  }
}
