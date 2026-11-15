import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authCookieName, isValidAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ authenticated: isValidAuthToken(cookieStore.get(authCookieName)?.value) });
}
