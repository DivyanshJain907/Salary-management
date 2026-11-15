import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Expense } from "@/models/Expense";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to load expenses", error);
    return NextResponse.json({ error: "Unable to load expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const amount = Number(body.amount);
    const date = typeof body.date === "string" ? body.date : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!category || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !description) {
      return NextResponse.json({ error: "Category, positive amount, date, and description are required" }, { status: 400 });
    }

    await connectToDatabase();
    const expense = await Expense.create({ category, amount, date, description, status: "Pending" });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense", error);
    return NextResponse.json({ error: "Unable to create expense" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    const body = await request.json();
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const amount = Number(body.amount);
    const date = typeof body.date === "string" ? body.date : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const status = body.status;

    if (!id || !category || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !["Approved", "Pending"].includes(status)) {
      return NextResponse.json({ error: "Valid expense details and status are required" }, { status: 400 });
    }

    await connectToDatabase();
    const expense = await Expense.findByIdAndUpdate(id, { category, amount, date, description, status }, { new: true, runValidators: true }).lean();
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json(expense);
  } catch (error) {
    console.error("Failed to update expense", error);
    return NextResponse.json({ error: "Unable to update expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 });
    await connectToDatabase();
    const result = await Expense.deleteOne({ _id: id });
    if (!result.deletedCount) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete expense", error);
    return NextResponse.json({ error: "Unable to delete expense" }, { status: 500 });
  }
}
