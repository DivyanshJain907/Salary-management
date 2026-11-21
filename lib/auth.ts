import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

export const authCookieName = "payroll_session";
export const employeeAuthCookieName = "employee_session";
const scrypt = promisify(nodeScrypt);

export function getEmployeeSessionSeconds() {
  const configuredDays = Number(process.env.EMPLOYEE_SESSION_DAYS || 30);
  const sessionDays = Number.isFinite(configuredDays) && configuredDays > 0 ? Math.min(configuredDays, 365) : 30;
  return 60 * 60 * 24 * sessionDays;
}

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

export async function hashEmployeePassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyEmployeePassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  const expectedKey = Buffer.from(key, "hex");
  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
}

export function createEmployeeAuthToken(employeeId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + getEmployeeSessionSeconds();
  const payload = `${employeeId}.${expiresAt}`;
  const signature = createHmac("sha256", getPassword()).update(`employee:${payload}`).digest("hex");
  return `${payload}.${signature}`;
}

export function getEmployeeIdFromAuthToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [employeeId, expiresAtText, signature] = parts;
  const expiresAt = Number(expiresAtText);
  if (!employeeId || !Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000) || !/^[a-f\d]{24}$/i.test(employeeId)) return null;
  const expectedSignature = createHmac("sha256", getPassword()).update(`employee:${employeeId}.${expiresAt}`).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return employeeId;
}
