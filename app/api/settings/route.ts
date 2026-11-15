import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

export const runtime = "nodejs";

const defaults = { key: "company", companyName: "Jain Sales Corporation", adminEmail: "", currency: "INR", payrollDay: 30 };

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate({ key: "company" }, { $setOnInsert: defaults }, { upsert: true, new: true }).lean();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to load settings", error);
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const adminEmail = typeof body.adminEmail === "string" ? body.adminEmail.trim() : "";
    const currency = typeof body.currency === "string" ? body.currency : "";
    const payrollDay = Number(body.payrollDay);

    if (!companyName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || !["INR", "USD", "EUR"].includes(currency) || !Number.isInteger(payrollDay) || payrollDay < 1 || payrollDay > 31) {
      return NextResponse.json({ error: "Enter a valid company name, email, currency, and payroll day" }, { status: 400 });
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate({ key: "company" }, { companyName, adminEmail, currency, payrollDay }, { upsert: true, new: true, runValidators: true }).lean();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to save settings", error);
    return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });
  }
}
