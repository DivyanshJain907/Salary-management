import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, isValidAuthToken } from "@/lib/auth";

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistanceMeters(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function requireAdminSession() {
  const cookieStore = await cookies();
  if (isValidAuthToken(cookieStore.get(authCookieName)?.value)) return null;
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
