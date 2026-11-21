import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { authCookieName, hashEmployeePassword, isValidAuthToken } from "@/lib/auth";
import { Employee } from "@/models/Employee";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAuthToken(cookieStore.get(authCookieName)?.value)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!Types.ObjectId.isValid(employeeId) || password.length < 8) {
      return NextResponse.json({ error: "A valid employee ID and password of at least 8 characters are required" }, { status: 400 });
    }

    await connectToDatabase();
    const employee = await Employee.findByIdAndUpdate(employeeId, { passwordHash: await hashEmployeePassword(password) }, { new: true }).select("_id name").lean<{ _id: Types.ObjectId; name: string } | null>();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ employeeId: String(employee._id), name: employee.name, configured: true });
  } catch (error) {
    console.error("Failed to configure employee credentials", error);
    return NextResponse.json({ error: "Unable to configure employee credentials" }, { status: 500 });
  }
}
