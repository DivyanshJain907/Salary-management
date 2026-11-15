import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const payments = await Payment.find().sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Failed to load payments", error);
    return NextResponse.json({ error: "Unable to load payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeName = typeof body.employeeName === "string" ? body.employeeName.trim() : "";
    const amount = Number(body.amount);
    const date = typeof body.date === "string" ? body.date : "";
    const method = body.method;
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";

    if (!employeeName || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["Bank transfer", "UPI", "Cash"].includes(method)) {
      return NextResponse.json({ error: "Employee, positive amount, date, and payment method are required" }, { status: 400 });
    }

    await connectToDatabase();
    const payment = await Payment.create({ employeeName, amount, date, method, reference, status: "Completed" });
    const employee = await Employee.findOne({ name: employeeName }).select("salary").lean<{ salary: number }>().exec();
    if (employee) {
      const payments = await Payment.aggregate([
        { $match: { employeeName, status: "Completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalPaid = payments[0]?.total || 0;
      const status = totalPaid >= employee.salary ? "Paid" : "Partial";
      await Employee.updateOne({ name: employeeName }, { $set: { status } });
    }
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Failed to create payment", error);
    return NextResponse.json({ error: "Unable to create payment" }, { status: 500 });
  }
}
