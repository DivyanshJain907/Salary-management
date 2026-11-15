import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { Advance } from "@/models/Advance";
import { Attendance } from "@/models/Attendance";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const [employees, advances, payments, attendance] = await Promise.all([
      Employee.find().select("name salary totalLeaveAllowance").lean(),
      Advance.find().select("employeeName amount date purpose method status").sort({ date: -1 }).lean(),
      Payment.find().select("employeeName amount date method status").sort({ date: -1 }).lean(),
      Attendance.find().select("employeeName date status").lean(),
    ]);
    const payrollMonth = new Date().toISOString().slice(0, 7);

    const names = new Set([
      ...employees.map((employee) => employee.name),
      ...advances.map((advance) => advance.employeeName),
      ...payments.map((payment) => payment.employeeName),
    ]);
    const ledger = Array.from(names).map((name) => {
      const employee = employees.find((item) => item.name === name);
      const employeeAdvances = advances.filter((item) => item.employeeName === name);
      const employeePayments = payments.filter((item) => item.employeeName === name);
      const leaveDays = attendance.filter((item) => item.employeeName === name && item.date.startsWith(payrollMonth) && ["Leave", "Absent"].includes(item.status)).length;
      const unpaidLeaveDays = Math.max(leaveDays - (employee?.totalLeaveAllowance || 0), 0);
      const leaveDeduction = unpaidLeaveDays * ((employee?.salary || 0) / 26);
      return {
        employeeName: name,
        salary: employee?.salary || 0,
        leaveAllowance: employee?.totalLeaveAllowance || 0,
        leaveDays,
        unpaidLeaveDays,
        leaveDeduction,
        netSalary: Math.max((employee?.salary || 0) - leaveDeduction, 0),
        totalAdvances: employeeAdvances.reduce((total, item) => total + item.amount, 0),
        totalPayments: employeePayments.reduce((total, item) => total + item.amount, 0),
        remainingSalary: Math.max(
          Math.max((employee?.salary || 0) - leaveDeduction, 0)
            - employeeAdvances.reduce((total, item) => total + item.amount, 0)
            - employeePayments.reduce((total, item) => total + item.amount, 0),
          0,
        ),
        transactions: [
          ...employeeAdvances.map((item) => ({ type: "Advance", amount: item.amount, date: item.date, description: `${item.purpose} (${item.method || "Cash"})`, status: item.status })),
          ...employeePayments.map((item) => ({ type: "Payment", amount: item.amount, date: item.date, description: item.method, status: item.status })),
        ].sort((a, b) => b.date.localeCompare(a.date)),
      };
    });

    return NextResponse.json(ledger);
  } catch (error) {
    console.error("Failed to load employee ledger", error);
    return NextResponse.json({ error: "Unable to load employee ledger" }, { status: 500 });
  }
}
