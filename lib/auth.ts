import { createHmac, timingSafeEqual } from "crypto";

export const authCookieName = "payroll_session";

function getPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not configured");
  return password;
}

export function createAuthToken() {
  return createHmac("sha256", getPassword()).update("jain-sales-payroll-session").digest("hex");
}

export function isValidAuthToken(token: string | undefined) {
  if (!token) return false;
  const expected = createAuthToken();
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
