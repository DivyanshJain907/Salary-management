import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Advance } from "@/models/Advance";
import { Attendance } from "@/models/Attendance";
import { AuditLog } from "@/models/AuditLog";
import { Employee } from "@/models/Employee";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const query = new URL(request.url).searchParams.get("query")?.trim();
    const employees = await Employee.find(
      query
        ? { $or: [{ name: { $regex: query, $options: "i" } }, { role: { $regex: query, $options: "i" } }] }
        : {},
    ).sort({ createdAt: -1 }).lean();
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to load employees", error);
    return NextResponse.json({ error: "Unable to load employees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const whatsappOptIn = body.whatsappOptIn === true;
    const salary = Number(body.salary);
    const joiningDate = typeof body.joiningDate === "string" ? body.joiningDate : "";
    const totalLeaveAllowance = Number(body.totalLeaveAllowance);

    if (!employeeId || !/^[A-Z0-9_-]{2,20}$/.test(employeeId) || !name || !role || !phone || !/^[0-9+\-()\s]{7,20}$/.test(phone) || !Number.isFinite(salary) || salary < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate) || !Number.isInteger(totalLeaveAllowance) || totalLeaveAllowance < 0) {
      return NextResponse.json({ error: "A short employee ID, name, role, phone, salary, joining date, and leave allowance are required" }, { status: 400 });
    }

    await connectToDatabase();
    const employee = await Employee.create({ employeeId, name, role, phone, whatsappOptIn, salary, joiningDate, totalLeaveAllowance, status: "Pending" });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Employee ID is already in use" }, { status: 409 });
    }
    console.error("Failed to create employee", error);
    return NextResponse.json({ error: "Unable to create employee" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "A valid employee id is required" }, { status: 400 });
    }

    await connectToDatabase();
    const employee = await Employee.findById(id).select("name").lean<{ name: string }>().exec();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await Promise.all([
      Employee.deleteOne({ _id: id }),
      Attendance.deleteMany({ employeeName: employee.name }),
      Advance.deleteMany({ employeeName: employee.name }),
      Payment.deleteMany({ employeeName: employee.name }),
      AuditLog.deleteMany({ entity: "Employee", details: { $regex: employee.name, $options: "i" } }),
    ]);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete employee", error);
    return NextResponse.json({ error: "Unable to delete employee" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const salary = Number(body.salary);
    const joiningDate = typeof body.joiningDate === "string" ? body.joiningDate : "";
    const totalLeaveAllowance = Number(body.totalLeaveAllowance);
    const whatsappOptIn = body.whatsappOptIn === true;

    if (!id || !Types.ObjectId.isValid(id) || !employeeId || !/^[A-Z0-9_-]{2,20}$/.test(employeeId) || !name || !role || !phone || !/^[0-9+\-()\s]{7,20}$/.test(phone) || !Number.isFinite(salary) || salary < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate) || !Number.isInteger(totalLeaveAllowance) || totalLeaveAllowance < 0) {
      return NextResponse.json({ error: "Valid employee details are required" }, { status: 400 });
    }

    await connectToDatabase();
    const employee = await Employee.findByIdAndUpdate(
      id,
      { employeeId, name, role, phone, whatsappOptIn, salary, joiningDate, totalLeaveAllowance },
      { new: true, runValidators: true },
    ).lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json(employee);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Employee ID is already in use" }, { status: 409 });
    }
    console.error("Failed to update employee", error);
    return NextResponse.json({ error: "Unable to update employee" }, { status: 500 });
  }
}
