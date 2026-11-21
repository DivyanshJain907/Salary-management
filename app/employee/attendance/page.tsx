"use client";

import { Camera, Loader2, LogOut, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CaptureState = "idle" | "requesting" | "ready" | "failed";

export default function EmployeeAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [locationState, setLocationState] = useState<CaptureState>("idle");
  const [cameraState, setCameraState] = useState<CaptureState>("idle");
  const [locationMessage, setLocationMessage] = useState("Location permission is required.");
  const [cameraMessage, setCameraMessage] = useState("Camera permission is required.");
  const [employeeMessage, setEmployeeMessage] = useState("Sign in with the employee ID and password provided by your administrator.");
  const [employeeName, setEmployeeName] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmployeeId, setLoginEmployeeId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/attendance/employee")
        .then(async (response) => {
          if (!response.ok) return;
          const result = await response.json();
          setAuthenticated(true);
          setEmployeeName(result.employee?.name || "");
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setEmployeeMessage("");
    try {
      const response = await fetch("/api/auth/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: loginEmployeeId, password: loginPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in");
      setAuthenticated(true);
      setEmployeeName(result.name);
      setLoginPassword("");
    } catch (error) {
      setEmployeeMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setLoginLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("failed");
      setLocationMessage("This browser does not support location services.");
      return;
    }
    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState("ready");
        setLocationMessage(`Location ready (accuracy ${Math.round(position.coords.accuracy)}m).`);
      },
      () => {
        setLocationState("failed");
        setLocationMessage("Location permission was denied or unavailable.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  const requestCamera = async () => {
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraState("ready");
      setCameraMessage("Camera ready. A fresh capture will be required.");
    } catch {
      setCameraState("failed");
      setCameraMessage("Camera permission was denied or unavailable.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
    setCameraMessage("Camera permission is required.");
  };

  const submitAttendance = () => {
    setEmployeeMessage("An approved face and liveness provider is required before attendance can be recorded.");
  };

  const logout = async () => {
    await fetch("/api/auth/employee/logout", { method: "POST" });
    setAuthenticated(false);
    setEmployeeName("");
    setEmployeeMessage("Signed out. Sign in again when you are ready.");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-700">Jain Sales Corporation</p>
          <h1 className="mt-1 text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Shift: 10:00 AM - 7:00 PM · Asia/Kolkata{employeeName ? ` · ${employeeName}` : ""}</p>
        </div>

        {!authenticated ? <form onSubmit={login} className="mb-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Employee sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use the existing employee ID and password provided by your administrator.</p>
          <label className="mt-4 block text-sm font-medium">Employee ID<input required value={loginEmployeeId} onChange={(event) => setLoginEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="ID shown in the admin Employee dropdown" /><span className="mt-1 block text-xs font-normal text-slate-500">This is the Employee ID shown beside the employee name, not the employee&apos;s phone or name.</span></label>
          <label className="mt-3 block text-sm font-medium">Password<input required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
          {employeeMessage && <p className="mt-3 text-sm text-rose-600">{employeeMessage}</p>}
          <button disabled={loginLoading} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{loginLoading ? "Signing in..." : "Sign in"}</button>
        </form> : <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div><strong>Signed in.</strong><p className="mt-1">{employeeName || "Employee account"}</p>{employeeMessage && <p className="mt-1 text-amber-800">{employeeMessage}</p>}</div><button onClick={logout} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800"><LogOut size={14} />Sign out</button></div>}

        <section className={`rounded-xl border bg-white p-5 shadow-sm ${authenticated ? "" : "pointer-events-none opacity-50"}`}>
          <h2 className="font-semibold">Today&apos;s verification</h2>
          <div className="mt-4 grid gap-3">
            <div className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${locationState === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : locationState === "failed" ? "border-rose-200 bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-600"}`}>
              <MapPin size={18} /> <span className="flex-1">{locationMessage}</span>
              <button onClick={requestLocation} disabled={locationState === "requesting"} className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-60">{locationState === "requesting" ? <Loader2 className="animate-spin" size={15} /> : "Allow"}</button>
            </div>

            <div className={`rounded-lg border p-3 text-sm ${cameraState === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : cameraState === "failed" ? "border-rose-200 bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-600"}`}>
              <div className="flex items-center gap-3"><Camera size={18} /> <span className="flex-1">{cameraMessage}</span><button onClick={cameraState === "ready" ? stopCamera : requestCamera} disabled={cameraState === "requesting"} className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-60">{cameraState === "requesting" ? <Loader2 className="animate-spin" size={15} /> : cameraState === "ready" ? "Stop" : "Allow"}</button></div>
              {cameraState === "ready" && <div className="mt-4 overflow-hidden rounded-lg bg-slate-900"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /></div>}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
            After authentication is connected, this step will show a random head-movement challenge and capture a fresh selfie. Gallery uploads and reused verification sessions will not be accepted.
          </div>
          <button onClick={submitAttendance} disabled={!authenticated} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Check in</button>
          <p className="mt-3 text-center text-xs text-slate-400">Check-out will use the same GPS and face verification flow.</p>
        </section>
      </div>
    </main>
  );
}
