"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, MapPin, Navigation, RefreshCw, Save, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Branch = {
  _id?: string;
  name: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  shiftStart: string;
  shiftEnd: string;
  gracePeriodMinutes: number | null;
  halfDayAfterMinutes: number | null;
  checkoutLivenessRequired: boolean;
  enabled: boolean;
};

type Verification = {
  _id: string;
  employeeId: string;
  eventType: string;
  status: string;
  provider: string;
  faceMatchStatus: string;
  livenessStatus: string;
  reason: string;
  createdAt: string;
};

type Employee = { _id: string; employeeId?: string; name: string; role: string };

type Enrollment = {
  _id: string;
  employeeId: string;
  status: "pending_consent" | "pending_approval" | "active" | "rejected" | "revoked";
  consentAt: string | null;
  approvedAt: string | null;
  referenceImageMimeType: string;
  referenceImageSize: number;
};

const emptyBranch: Branch = {
  name: "Main branch",
  timezone: "Asia/Kolkata",
  latitude: null,
  longitude: null,
  radiusMeters: 50,
  shiftStart: "10:00",
  shiftEnd: "19:00",
  gracePeriodMinutes: null,
  halfDayAfterMinutes: null,
  checkoutLivenessRequired: false,
  enabled: true,
};

export default function AttendancePage() {
  const [branch, setBranch] = useState<Branch>(emptyBranch);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [credentialEmployeeId, setCredentialEmployeeId] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentEmployeeId, setEnrollmentEmployeeId] = useState("");
  const [enrollmentImage, setEnrollmentImage] = useState("");
  const [enrollmentImageName, setEnrollmentImageName] = useState("");
  const [enrollmentConsent, setEnrollmentConsent] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [branchResponse, verificationResponse, employeesResponse, enrollmentResponse] = await Promise.all([
        fetch("/api/attendance/branches"),
        fetch("/api/attendance/verifications"),
        fetch("/api/employees"),
        fetch("/api/attendance/enrollment"),
      ]);
      const branchResult = await branchResponse.json();
      const verificationResult = await verificationResponse.json();
      const employeesResult = await employeesResponse.json();
      const enrollmentResult = await enrollmentResponse.json();
      if (!branchResponse.ok) throw new Error(branchResult.error || "Unable to load branch settings");
      if (!verificationResponse.ok) throw new Error(verificationResult.error || "Unable to load verification attempts");
      setBranch({ ...emptyBranch, ...branchResult });
      setVerifications(verificationResult);
      setEmployees(employeesResponse.ok ? employeesResult : []);
      setEnrollments(enrollmentResponse.ok ? enrollmentResult : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load attendance module");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const counts = useMemo(() => ({
    total: verifications.length,
    pending: verifications.filter((item) => ["manual_review", "inconclusive"].includes(item.status)).length,
    failed: verifications.filter((item) => item.status === "failed").length,
    unavailable: verifications.filter((item) => item.status === "service_unavailable").length,
  }), [verifications]);

  const mapUrl = useMemo(() => {
    if (branch.latitude === null || branch.longitude === null) return "https://www.google.com/maps?q=India&z=5&output=embed";
    return `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}&z=17&output=embed`;
  }, [branch.latitude, branch.longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser does not support location services.");
      return;
    }
    setLocationLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranch({ ...branch, latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setError("Location permission was denied or unavailable.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  const selectEnrollmentImage = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Select a JPEG, PNG, or WebP reference photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Reference photo must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEnrollmentImage(typeof reader.result === "string" ? reader.result : "");
      setEnrollmentImageName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const saveEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingEnrollment(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/attendance/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: enrollmentEmployeeId, image: enrollmentImage, consent: enrollmentConsent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save reference photo");
      setEnrollments((current) => [result, ...current.filter((item) => item.employeeId !== result.employeeId)]);
      setEnrollmentImage("");
      setEnrollmentImageName("");
      setEnrollmentConsent(false);
      setMessage("Reference photo saved and waiting for authorized approval.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save reference photo");
    } finally {
      setSavingEnrollment(false);
    }
  };

  const approveEnrollment = async (employeeId: string, approved: boolean) => {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/attendance/enrollment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, approved }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update enrollment");
      setEnrollments((current) => current.map((item) => item.employeeId === employeeId ? result : item));
      setMessage(approved ? "Enrollment approved." : "Enrollment rejected.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update enrollment");
    }
  };

  const saveBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/attendance/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save branch settings");
      setBranch({ ...emptyBranch, ...result });
      setMessage("Attendance branch settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save branch settings");
    } finally {
      setSaving(false);
    }
  };

  const saveCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCredentials(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/employees/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: credentialEmployeeId, password: credentialPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to configure employee access");
      setCredentialPassword("");
      setMessage(`Employee access configured for ${result.name}. Share the employee ID and password securely.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to configure employee access");
    } finally {
      setSavingCredentials(false);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading attendance module...</main>;

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"><ArrowLeft size={16} />Back to payroll</Link>
            <h1 className="text-2xl font-semibold tracking-tight">Attendance verification</h1>
            <p className="mt-1 text-sm text-slate-500">Isolated configuration and review controls. Payroll calculations are not changed.</p>
          </div>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCw size={16} />Refresh</button>
        </div>

        {(error || message) && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Verification attempts", counts.total],
            ["Manual review", counts.pending],
            ["Failed", counts.failed],
            ["Service unavailable", counts.unavailable],
          ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={saveBranch} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><MapPin size={20} /></div><div><h2 className="font-semibold">Branch and shift</h2><p className="mt-1 text-xs text-slate-500">GPS remains unavailable until both coordinates are configured.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">Branch name<input value={branch.name} onChange={(event) => setBranch({ ...branch, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
              <label className="text-sm font-medium">Latitude<input type="number" step="any" value={branch.latitude ?? ""} onChange={(event) => setBranch({ ...branch, latitude: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="Required to enable GPS" /></label>
              <label className="text-sm font-medium">Longitude<input type="number" step="any" value={branch.longitude ?? ""} onChange={(event) => setBranch({ ...branch, longitude: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="Required to enable GPS" /></label>
              <label className="text-sm font-medium">Radius (metres)<input type="number" min="1" value={branch.radiusMeters} onChange={(event) => setBranch({ ...branch, radiusMeters: Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
              <label className="text-sm font-medium">Timezone<input value={branch.timezone} onChange={(event) => setBranch({ ...branch, timezone: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">Branch location</p><button type="button" onClick={useCurrentLocation} disabled={locationLoading} className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"><Navigation size={14} />{locationLoading ? "Getting location..." : "Use my location"}</button></div>
                <iframe title="Google Map branch location" src={mapUrl} className="h-56 w-full rounded-lg border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                <p className="mt-2 text-xs text-slate-500">You can use your current coordinates or enter latitude and longitude manually.</p>
              </div>
              <label className="text-sm font-medium">Shift start<input type="time" value={branch.shiftStart} onChange={(event) => setBranch({ ...branch, shiftStart: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
              <label className="text-sm font-medium">Shift end<input type="time" value={branch.shiftEnd} onChange={(event) => setBranch({ ...branch, shiftEnd: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" /></label>
              <label className="text-sm font-medium">Grace period (minutes)<input type="number" min="0" value={branch.gracePeriodMinutes ?? ""} onChange={(event) => setBranch({ ...branch, gracePeriodMinutes: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="Configure policy" /></label>
              <label className="text-sm font-medium">Half-day threshold (minutes)<input type="number" min="0" value={branch.halfDayAfterMinutes ?? ""} onChange={(event) => setBranch({ ...branch, halfDayAfterMinutes: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="Configure policy" /></label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={branch.checkoutLivenessRequired} onChange={(event) => setBranch({ ...branch, checkoutLivenessRequired: event.target.checked })} />Require liveness at check-out</label>
            <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"><Save size={16} />{saving ? "Saving..." : "Save settings"}</button>
          </form>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><ShieldCheck size={20} /></div><div><h2 className="font-semibold">Verification review</h2><p className="mt-1 text-xs text-slate-500">No face match is approved while the provider is unconfigured.</p></div></div>
            {verifications.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No verification attempts have been recorded.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 pr-4">Employee ID</th><th className="pb-3 pr-4">Event</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Created</th></tr></thead><tbody>{verifications.map((item) => <tr key={item._id} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{item.employeeId}</td><td className="py-3 pr-4 capitalize">{item.eventType.replace("_", " ")}</td><td className="py-3 pr-4"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${item.status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "verified" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}{item.status.replace("_", " ")}</span></td><td className="py-3 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>}
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={saveEnrollment} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-700"><Upload size={20} /></div><div><h2 className="font-semibold">Employee reference photo</h2><p className="mt-1 text-xs text-slate-500">Upload a clear, current reference image. It is not public and does not become active until approved.</p></div></div>
            <label className="block text-sm font-medium">Employee<select required value={enrollmentEmployeeId} onChange={(event) => setEnrollmentEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal outline-none focus:border-blue-500"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.employeeId || employee._id}</option>)}</select></label>
            <label className="mt-4 block text-sm font-medium">Reference image<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectEnrollmentImage(event.target.files?.[0])} className="mt-1 w-full text-sm" /><span className="mt-1 block text-xs font-normal text-slate-500">{enrollmentImageName || "JPEG, PNG, or WebP, up to 5 MB"}</span></label>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-600"><input required type="checkbox" checked={enrollmentConsent} onChange={(event) => setEnrollmentConsent(event.target.checked)} />I confirm that the employee received the privacy notice and gave explicit consent.</label>
            <button disabled={savingEnrollment || !enrollmentImage} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"><Upload size={16} />{savingEnrollment ? "Saving..." : "Save for approval"}</button>
          </form>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Enrollment approvals</h2>
            <p className="mt-1 text-xs text-slate-500">Reference photos do not activate without authorized approval.</p>
            {enrollments.length === 0 ? <div className="mt-5 rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No employee reference photos have been submitted.</div> : <div className="mt-4 space-y-3">{enrollments.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{employees.find((employee) => employee._id === item.employeeId)?.name || item.employeeId}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.status.replace("_", " ")}</p></div>{item.status === "pending_approval" ? <div className="flex gap-2"><button onClick={() => approveEnrollment(item.employeeId, true)} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white">Approve</button><button onClick={() => approveEnrollment(item.employeeId, false)} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600">Reject</button></div> : <span className="text-xs text-slate-400">{item.approvedAt ? "Approved" : "Inactive"}</span>}</div>)}</div>}
          </section>
        </div>

        <form onSubmit={saveCredentials} className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-700"><KeyRound size={20} /></div><div><h2 className="font-semibold">Provision employee access</h2><p className="mt-1 text-xs text-slate-500">Uses the existing employee record ID. Passwords are hashed and never returned.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Employee<select required value={credentialEmployeeId} onChange={(event) => setCredentialEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal outline-none focus:border-blue-500"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · Employee ID: {employee.employeeId || employee._id}</option>)}</select></label>
            <label className="text-sm font-medium">Temporary password<input required minLength={8} type="password" value={credentialPassword} onChange={(event) => setCredentialPassword(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal outline-none focus:border-blue-500" placeholder="At least 8 characters" /></label>
          </div>
          <button disabled={savingCredentials} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"><KeyRound size={16} />{savingCredentials ? "Saving..." : "Set employee password"}</button>
        </form>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Safe deployment boundary:</strong> employee authentication is now connected, but check-in remains unavailable until an approved face/liveness model is configured. The provider interface fails closed and supports manual review instead of generating fake similarity or liveness results.</div>
      </div>
    </main>
  );
}
