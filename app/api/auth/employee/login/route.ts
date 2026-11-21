import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createEmployeeAuthToken, employeeAuthCookieName, getEmployeeSessionSeconds, verifyEmployeePassword } from "@/lib/auth";
import { Employee } from "@/models/Employee";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!employeeId || !password) {
      return NextResponse.json({ error: "Employee ID and password are required" }, { status: 400 });
    }

    await connectToDatabase();
    const employeeLookup = Types.ObjectId.isValid(employeeId)
      ? { $or: [{ employeeId }, { _id: new Types.ObjectId(employeeId) }] }
      : { employeeId };
    const employee = await Employee.findOne(employeeLookup).select("+passwordHash name").lean<{ _id: Types.ObjectId; name: string; passwordHash?: string }>();
    if (!employee?.passwordHash || !(await verifyEmployeePassword(password, employee.passwordHash))) {
      return NextResponse.json({ error: "Invalid employee ID or password" }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true, role: "employee", employeeId: String(employee._id), name: employee.name });
    response.cookies.set(employeeAuthCookieName, createEmployeeAuthToken(String(employee._id)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getEmployeeSessionSeconds(),
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Employee login failed", error);
    return NextResponse.json({ error: "Unable to log in" }, { status: 500 });
  }
}
