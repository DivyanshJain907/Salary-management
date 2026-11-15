import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { Advance } from "@/models/Advance";
import { Employee } from "@/models/Employee";
import { Payment } from "@/models/Payment";
import { PayrollRun } from "@/models/PayrollRun";

export const runtime = "nodejs";

const validMonth = /^\d{4}-\d{2}$/;
const validMethods = ["Bank transfer", "UPI", "Cash"] as const;

export async function POST(request: Request) {
  let runId: unknown;
  const createdPaymentIds: unknown[] = [];

  try {
    const body = await request.json();
    const month = typeof body.month === "string" ? body.month : "";
    const paymentMethod = body.paymentMethod;

    if (!validMonth.test(month) || !validMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: "A valid payroll month and payment method are required" }, { status: 400 });
    }

    await connectToDatabase();
    const existingRun = await PayrollRun.findOne({ month }).select("_id").lean().exec();
    if (existingRun) {
      return NextResponse.json({ error: `A payroll run already exists for ${month}` }, { status: 409 });
    }

    const [employees, attendance, advances, payments] = await Promise.all([
      Employee.find().lean(),
      Attendance.find({ date: new RegExp(`^${month}-`), status: { $in: ["Leave", "Absent"] } }).lean(),
      Advance.find({ date: new RegExp(`^${month}-`) }).lean(),
      Payment.find({ date: new RegExp(`^${month}-`), status: "Completed" }).lean(),
    ]);

    if (employees.length === 0) {
      return NextResponse.json({ error: "Add at least one employee before creating a payroll run" }, { status: 400 });
    }

    const paymentDate = new Date().toISOString().slice(0, 10);
    const calculations = employees.map((employee) => {
      const leaveDays = attendance.filter((record) => record.employeeName === employee.name).length;
      const unpaidLeaveDays = Math.max(leaveDays - (employee.totalLeaveAllowance || 0), 0);
      const leaveDeduction = unpaidLeaveDays * ((employee.salary || 0) / 26);
      const netSalary = Math.max((employee.salary || 0) - leaveDeduction, 0);
      const alreadyPaid = payments
        .filter((payment) => payment.employeeName === employee.name)
        .reduce((total, payment) => total + payment.amount, 0);
      const employeeAdvances = advances
        .filter((advance) => advance.employeeName === employee.name)
        .reduce((total, advance) => total + advance.amount, 0);
      const totalPaid = alreadyPaid + employeeAdvances;

      return {
        employee,
        leaveDeduction,
        employeeAdvances,
        payable: Math.max(netSalary - totalPaid, 0),
      };
    });

    const grossSalary = employees.reduce((total, employee) => total + (employee.salary || 0), 0);
    const leaveDeduction = calculations.reduce((total, calculation) => total + calculation.leaveDeduction, 0);
    const advancesPaid = calculations.reduce((total, calculation) => total + calculation.employeeAdvances, 0);
    const totalPayable = calculations.reduce((total, calculation) => total + calculation.payable, 0);

    const run = await PayrollRun.create({
      month,
      paymentMethod,
      employeeCount: employees.length,
      grossSalary,
      leaveDeduction,
      advancesPaid,
      totalPayable,
      status: "Processing",
    });
    runId = run._id;

    const paymentDocuments = calculations
      .filter((calculation) => calculation.payable > 0)
      .map((calculation) => ({
        employeeName: calculation.employee.name,
        amount: calculation.payable,
        date: paymentDate,
        method: paymentMethod,
        reference: `Payroll run ${month}`,
        payrollMonth: month,
        status: "Completed" as const,
      }));

    const createdPayments = paymentDocuments.length ? await Payment.insertMany(paymentDocuments) : [];
    createdPaymentIds.push(...createdPayments.map((payment) => payment._id));
    await PayrollRun.updateOne({ _id: run._id }, { $set: { status: "Completed" } });

    return NextResponse.json({
      run: { ...run.toObject(), status: "Completed" },
      payments: createdPayments,
    }, { status: 201 });
  } catch (error: unknown) {
    if (runId) {
      await Payment.deleteMany({ _id: { $in: createdPaymentIds } }).catch((cleanupError) => {
        console.error("Failed to clean up payroll payments", cleanupError);
      });
      await PayrollRun.deleteOne({ _id: runId }).catch((cleanupError) => {
        console.error("Failed to clean up payroll run", cleanupError);
      });
    }
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A payroll run already exists for this month" }, { status: 409 });
    }
    console.error("Failed to create payroll run", error);
    return NextResponse.json({ error: "Unable to create payroll run" }, { status: 500 });
  }
}
