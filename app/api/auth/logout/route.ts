import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set("payroll_session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
