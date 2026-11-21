"use client";

import { Camera, Loader2, LogOut, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CaptureState = "idle" | "requesting" | "ready" | "failed";

export default function EmployeeAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [selfie, setSelfie] = useState("");
  const [challenge, setChallenge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [selfieDescriptor, setSelfieDescriptor] = useState<number[]>([]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (cameraState !== "ready" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      setCameraMessage("Camera stream started, but playback was blocked. Tap the preview or the Allow button again.");
    });
  }, [cameraState]);

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
    if (!window.isSecureContext) {
      setCameraState("failed");
      setCameraMessage("Camera access requires HTTPS. Open this page on HTTPS or localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("failed");
      setCameraMessage("This browser or device does not support camera access.");
      return;
    }
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setCameraState("idle");
        setCameraMessage("Camera stopped unexpectedly. Allow camera access again.");
      });
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

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setAttendanceMessage("Camera preview is not ready yet. Wait for the live image, then capture again.");
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const direction = Math.random() > 0.5 ? "turn head left" : "turn head right";
    setChallenge(direction);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    setSelfie(imageData);
    setAttendanceMessage("Processing the fresh selfie...");
    void (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        const image = new Image();
        image.src = imageData;
        await image.decode();
        const result = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor();
        if (!result) {
          setSelfieDescriptor([]);
          setAttendanceMessage("No clear face was detected. Re-capture in better lighting.");
          return;
        }
        setSelfieDescriptor(Array.from(result.descriptor));
        setAttendanceMessage(`Fresh selfie captured. Face detected. Movement challenge: ${direction}.`);
      } catch {
        setSelfieDescriptor([]);
        setAttendanceMessage("Unable to process the selfie. Re-capture and try again.");
      }
    })();
  };

  const submitAttendance = async (eventType: "check_in" | "check_out") => {
    if (!selfie) {
      setAttendanceMessage("Capture a fresh selfie before submitting.");
      return;
    }
    setSubmitting(true);
    setAttendanceMessage("Checking GPS and verification...");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
      });
      const response = await fetch("/api/attendance/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          selfie,
          challenge,
          selfieDescriptor,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.reason || "Attendance could not be recorded");
      setAttendanceMessage(`${eventType === "check_in" ? "Check-in" : "Check-out"} verified.`);
    } catch (error) {
      setAttendanceMessage(error instanceof Error ? error.message : "Attendance could not be recorded");
    } finally {
      setSubmitting(false);
    }
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
              {cameraState === "ready" && <div className="mt-4 overflow-hidden rounded-lg bg-slate-900"><video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={(event) => void event.currentTarget.play().catch(() => undefined)} className="aspect-video w-full object-cover" /><canvas ref={canvasRef} className="hidden" /><button onClick={captureSelfie} className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Capture fresh selfie</button></div>}
            </div>
          </div>

          {attendanceMessage && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{attendanceMessage}</div>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => submitAttendance("check_in")} disabled={!authenticated || !selfie || selfieDescriptor.length !== 128 || submitting} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Submitting..." : "Check in"}</button>
            <button onClick={() => submitAttendance("check_out")} disabled={!authenticated || !selfie || selfieDescriptor.length !== 128 || submitting} className="rounded-lg border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700 disabled:opacity-50">Check out</button>
          </div>
        </section>
      </div>
    </main>
  );
}
