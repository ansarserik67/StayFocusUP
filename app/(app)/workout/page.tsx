"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  Dumbbell,
  Loader2,
  Lock,
  PersonStanding,
  Play,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Square,
  Timer,
  X,
  Zap,
} from "lucide-react";

import { BreathingOverlay } from "@/components/breathe/BreathingOverlay";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { TranslationKey } from "@/lib/i18n";
import {
  EXERCISES,
  RepCounter,
  evaluateFrame,
  type CounterState,
  type ExerciseId,
  type FormFault,
  type Landmark,
} from "@/lib/workout/engine";
import { loadPoseLandmarker, releasePoseLandmarker } from "@/lib/workout/pose";

type Phase = "idle" | "connecting" | "active" | "denied" | "error" | "finished";

const EXERCISE_META: Array<{
  id: ExerciseId;
  icon: typeof Dumbbell;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}> = [
  { id: "pushup", icon: Dumbbell, labelKey: "workout.ex.pushup", descKey: "workout.ex.pushupDesc" },
  { id: "squat", icon: Activity, labelKey: "workout.ex.squat", descKey: "workout.ex.squatDesc" },
  {
    id: "jumpingjack",
    icon: PersonStanding,
    labelKey: "workout.ex.jumpingjack",
    descKey: "workout.ex.jumpingjackDesc",
  },
];

const BONES: Array<[number, number]> = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];

const WORKING_JOINTS: Record<ExerciseId, number[]> = {
  pushup: [13, 14],
  squat: [25, 26],
  jumpingjack: [15, 16, 27, 28],
};

function relativeTime(t: (key: TranslationKey, vars?: Record<string, string | number>) => string, iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("workout.secAgo", { count: Math.max(1, Math.floor(diff / 1000)) });
  if (minutes < 60) return t("workout.minAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("workout.hourAgo", { count: hours });
  return t("workout.dayAgo", { count: Math.floor(hours / 24) });
}

export default function WorkoutPage() {
  const { t } = useLang();
  const { state, completeWorkout } = useFocus();
  const router = useRouter();

  const [exercise, setExercise] = useState<ExerciseId>("pushup");
  const [cameraExercise, setCameraExercise] = useState<ExerciseId | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [counter, setCounter] = useState<CounterState | null>(null);
  const [errorName, setErrorName] = useState("");
  const [reward, setReward] = useState(0);
  const [giveUpOpen, setGiveUpOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const counterRef = useRef<RepCounter | null>(null);
  const startedAtRef = useRef(0);
  const lastSetAtRef = useRef(0);
  const lastPaintRef = useRef(0);
  const rewardedRef = useRef(false);
  const startingRef = useRef(false);

  const config = EXERCISES[exercise];

  /** Stops the loop, the camera and every track behind it. Idempotent. */
  const stop = useCallback(() => {
    runningRef.current = false;
    startingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* track already ended by the browser */
        }
      }
    }
    // Detaching the stream is what actually releases the camera light on iOS;
    // leaving the old MediaStream on the element keeps it alive.
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => stop, [stop]);

  // The landmarker holds WASM memory and a WebGL context, so the workout
  // screen hands it back when it is done with it.
  useEffect(() => {
    const release = () => releasePoseLandmarker();
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  useEffect(() => {
    if (!cameraExercise) return;
    let cancelled = false;
    const selected = cameraExercise;

    const paint = (landmarks: Landmark[] | null) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (!landmarks) return;

      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(3, width / 220);
      const working = WORKING_JOINTS[selected];

      for (const [from, to] of BONES) {
        const a = landmarks[from];
        const b = landmarks[to];
        if (!a || !b) continue;
        if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
        const highlight = working.includes(from) || working.includes(to);
        ctx.strokeStyle = highlight ? "rgba(251, 191, 36, 0.95)" : "rgba(34, 211, 238, 0.9)";
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }

      landmarks.forEach((point, index) => {
        if ((point.visibility ?? 1) < 0.5) return;
        const highlight = working.includes(index);
        ctx.beginPath();
        ctx.fillStyle = highlight ? "rgba(251, 191, 36, 1)" : "rgba(16, 185, 129, 1)";
        ctx.arc(point.x * width, point.y * height, highlight ? 5.5 : 3.6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const start = async () => {
      // A fast double tap on "start" used to open two camera streams and two
      // detection loops; only one start may ever be in flight.
      if (startingRef.current) return;
      startingRef.current = true;
      setPhase("connecting");
      setCounter(null);
      setErrorName("");
      rewardedRef.current = false;
      counterRef.current = new RepCounter(selected);

      for (let attempt = 0; attempt < 80 && !videoRef.current; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 16));
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        startingRef.current = false;
        setErrorName("MediaDevicesUnsupported");
        setPhase("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const element = videoRef.current;
        if (!element) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          startingRef.current = false;
          setPhase("error");
          return;
        }
        element.srcObject = stream;
        await element.play().catch(() => undefined);
      } catch (error) {
        startingRef.current = false;
        if (cancelled) return;
        const name = error instanceof Error ? error.name : "";
        setErrorName(name);
        setPhase(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
        return;
      }

      try {
        const landmarker = await loadPoseLandmarker();
        if (cancelled) {
          // The screen was left while the model was still warming up.
          releasePoseLandmarker();
          return;
        }

        startingRef.current = false;
        setPhase("active");
        runningRef.current = true;
        startedAtRef.current = performance.now();
        lastSetAtRef.current = performance.now();
        let lastTimestamp = 0;

        const tick = () => {
          if (!runningRef.current || cancelled) return;
          const element = videoRef.current;
          if (element && element.readyState >= 2) {
            const timestamp = Math.max(performance.now(), lastTimestamp + 1);
            lastTimestamp = timestamp;
            let landmarks: Landmark[] | null = null;
            try {
              const result = landmarker.detectForVideo(element, timestamp);
              landmarks = (result.landmarks?.[0] as Landmark[] | undefined) ?? null;
            } catch {
              landmarks = null;
            }

            const frame = evaluateFrame(selected, landmarks);
            const next = frame ? counterRef.current?.push(frame) : null;
            if (next) {
              const now = performance.now();
              if (now - lastPaintRef.current > 80) {
                lastPaintRef.current = now;
                setCounter(next);
              }
              if (next.done && !rewardedRef.current) {
                rewardedRef.current = true;
                runningRef.current = false;
                stop();
                paint(null);
                setCounter(next);
                setReward(config.rewardSeconds);
                setPhase("finished");
                completeWorkout({
                  exercise: selected,
                  reps: next.reps,
                  durationSeconds: (performance.now() - startedAtRef.current) / 1000,
                });
                return;
              }
            }
            if (performance.now() - lastPaintRef.current > 80) paint(landmarks);
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (error) {
        startingRef.current = false;
        if (cancelled) return;
        // A release during load is not a failure the user should see.
        const message = error instanceof Error ? error.name : "";
        if (message === "PoseLandmarkerReleased") {
          setPhase("idle");
          return;
        }
        setPhase("error");
        setErrorName("ModelUnavailable");
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
    // config.rewardSeconds is stable per exercise; completeWorkout is memoized.
  }, [cameraExercise, stop, completeWorkout, config.rewardSeconds]);

  useEffect(() => {
    if (phase !== "active") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("workout.beforeUnload");
      return t("workout.beforeUnload");
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, t]);

  const startCamera = () => {
    stop();
    setCameraExercise(exercise);
  };

  const stopCamera = () => {
    stop();
    setCameraExercise(null);
    setPhase("idle");
    setCounter(null);
  };

  const finishExit = () => {
    setGiveUpOpen(false);
    stop();
    setCameraExercise(null);
    setPhase("idle");
    setCounter(null);
    router.push("/dashboard");
  };

  const requestExit = () => {
    stop();
    setCameraExercise(null);
    setPhase("idle");
    setCounter(null);
    setGiveUpOpen(true);
  };

  const reps = counter?.reps ?? 0;
  const required = config.requiredReps;
  const rejected = counter?.rejected ?? 0;
  const progress = Math.min(1, reps / required);
  const visibleFault = counter?.faults[0];
  const busy = phase === "connecting" || phase === "active";

  const faultKey = (fault: FormFault | undefined): TranslationKey => {
    switch (fault) {
      case "sagging":
        return "workout.fault.sagging";
      case "piking":
        return "workout.fault.piking";
      case "shallow":
        return "workout.fault.shallow";
      case "armsDown":
        return "workout.fault.armsDown";
      default:
        return "workout.fault.notVisible";
    }
  };

  const cue = visibleFault
    ? t(faultKey(visibleFault))
    : exercise === "jumpingjack"
      ? t(counter?.phase === "open" ? "workout.closeFeet" : "workout.openFeet")
      : counter?.phase === "bottom"
        ? t("workout.goUp")
        : t("workout.formOk");

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
            {t("workout.title")}
          </p>
          <h1 className="text-page mt-1.5">{t("workout.subtitle")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
            <ShieldCheck size={12} />
            {t("landing.privacy")}
          </span>
          <span className="chip">
            <Zap size={12} className="text-amber" />
            {t("dash.energy")}: {state.energy}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        {/* camera studio */}
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/12 text-emerald">
                <ScanFace size={16} />
              </span>
              <div>
                <p className="text-[13px] font-bold leading-tight">{t(`workout.ex.${exercise}`)}</p>
                <p className="text-[10.5px] text-ink-mute">
                  {required} {t("common.reps")} · {t("workout.reward")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`chip !text-[10px] ${
                  phase === "active"
                    ? "!border-emerald/40 !bg-emerald/10 !text-emerald"
                    : phase === "error" || phase === "denied"
                      ? "!border-rose/40 !bg-rose/10 !text-rose"
                      : ""
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    phase === "active" ? "animate-pulse bg-emerald" : "bg-ink-mute"
                  }`}
                />
                {phase === "active" ? "LIVE" : phase === "finished" ? t("common.done") : "AI"}
              </span>
              {busy && (
                <button type="button" onClick={stopCamera} className="btn-icon !h-8 !w-8" aria-label={t("workout.stopCamera")}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#060d16]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 h-full w-full scale-x-[-1] object-contain ${
                phase === "active" || phase === "connecting" ? "opacity-100" : "opacity-0"
              }`}
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-contain"
            />

            {/* idle / finished placeholder */}
            {(phase === "idle" || phase === "finished") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <svg viewBox="0 0 400 300" className="h-full w-full">
                    <defs>
                      <radialGradient id="scan-glow">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <rect width="400" height="300" fill="url(#scan-glow)" />
                    <g stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
                      <circle cx="200" cy="72" r="20" />
                      <path d="M200 92v62M200 108l-42 26M200 108l42 26M200 154l-30 62M200 154l30 62" />
                      <path d="M182 216l-8 46M218 216l8 46" />
                    </g>
                    {[
                      [200, 72],
                      [200, 108],
                      [200, 154],
                      [158, 134],
                      [242, 134],
                      [170, 216],
                      [230, 216],
                    ].map(([x, y], index) => (
                      <circle key={index} cx={x} cy={y} r="4" fill="#34D399" />
                    ))}
                  </svg>
                </div>

                {phase === "finished" ? (
                  <div className="relative">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-cyan text-[#04211a] shadow-lg">
                      <ShieldCheck size={30} />
                    </span>
                    <h2 className="font-display mt-3 text-[23px] font-extrabold text-white">
                      {t("workout.completeTitle")}
                    </h2>
                    <p className="mt-1.5 text-[13px] text-white/70">
                      {t("workout.completeText", { reps })}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="chip !border-emerald/40 !bg-emerald/15 !text-emerald">
                        +{Math.round(reward / 60)} {t("common.minutes")}
                      </span>
                      <span className="chip !border-amber/40 !bg-amber/15 !text-amber">
                        {t("workout.claimEnergy", { energy: config.energy })}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhase("idle");
                          setCounter(null);
                          setCameraExercise(null);
                        }}
                        className="btn btn-primary"
                      >
                        {t("workout.again")}
                      </button>
                      <Link href="/social" className="btn btn-secondary !bg-white/10 !text-white">
                        {t("dash.openHub")}
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald/30 bg-emerald/10 text-emerald">
                      <Camera size={24} />
                    </span>
                    <h2 className="font-display mt-3 text-[21px] font-extrabold text-white">
                      {t("workout.title")}
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-[34ch] text-[12.5px] leading-relaxed text-white/60">
                      {t("workout.chooseHint")}
                    </p>
                    <button type="button" onClick={startCamera} className="btn btn-primary mt-4">
                      <Play size={16} />
                      {t("workout.startCamera")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === "connecting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060d16]/80 text-center text-white/80">
                <Loader2 size={26} className="animate-spin text-emerald" />
                <p className="text-[12.5px]">{t("workout.cameraStarting")}</p>
                <p className="text-[11px] text-white/40">{t("workout.modelLoading")}</p>
              </div>
            )}

            {(phase === "denied" || phase === "error") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose/15 text-rose">
                  <CameraOff size={22} />
                </span>
                <h2 className="font-display mt-3 text-[19px] font-extrabold text-white">
                  {t(
                    phase === "denied"
                      ? "workout.cameraDenied"
                      : errorName === "NotFoundError"
                        ? "workout.cameraMissing"
                        : "workout.cameraError",
                  )}
                </h2>
                <p className="mx-auto mt-1.5 max-w-[40ch] text-[12px] leading-relaxed text-white/60">
                  {t(
                    phase === "denied"
                      ? "workout.cameraDeniedHelp"
                      : errorName === "NotFoundError"
                        ? "workout.cameraMissingHelp"
                        : "workout.cameraErrorHelp",
                  )}
                </p>
                {errorName && <p className="mt-2 font-mono text-[10px] text-white/35">{errorName}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraExercise(null);
                      setPhase("idle");
                    }}
                    className="btn btn-primary"
                  >
                    {t("workout.retry")}
                  </button>
                </div>
              </div>
            )}

            {/* live HUD */}
            {phase === "active" && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur">
                    <Camera size={12} className="text-emerald" />
                    {t(`workout.ex.${exercise}`)}
                  </span>
                  <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] text-white/60 backdrop-blur">
                    {t("workout.mirrorHint")}
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent p-3.5 pt-10">
                  <div>
                    <p className="mono font-display text-[34px] font-extrabold leading-none text-white">
                      {reps}
                      <span className="ml-1 text-[14px] font-semibold text-white/55">/ {required}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-white/55">{t("workout.reps")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold text-emerald">{cue}</p>
                    {counter?.angle !== null && counter?.angle !== undefined && exercise !== "jumpingjack" && (
                      <p className="mono mt-0.5 text-[10.5px] text-white/50">
                        {t("workout.angle", { value: Math.round(counter.angle) })}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* progress strip */}
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ProgressRing progress={progress} size={54} stroke={5} label={`${reps}/${required}`}>
                  <span className="mono text-[10px] font-bold">{Math.round(progress * 100)}%</span>
                </ProgressRing>
                <div>
                  <p className="text-[13px] font-semibold">
                    {t("workout.progress", { done: reps, target: required })}
                  </p>
                  <p className={`mt-0.5 text-[11px] ${visibleFault ? "text-amber" : "text-ink-mute"}`}>
                    {phase === "active" ? (visibleFault ? cue : t("workout.formOk")) : t("workout.privacy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rejected > 0 && (
                  <span className="chip !border-amber/30 !bg-amber/10 !text-amber !text-[10px]">
                    {t("workout.rejected", { count: rejected })}
                  </span>
                )}
                {busy && (
                  <button type="button" onClick={stopCamera} className="btn btn-secondary !min-h-[38px] text-[12px]">
                    <Square size={13} />
                    {t("workout.stopCamera")}
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={requestExit}
              className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-mute underline-offset-4 transition hover:text-rose hover:underline"
            >
              <Lock size={12} />
              {t("workout.exit")}
            </button>
          </div>
        </section>

        {/* side panel */}
        <div className="space-y-4">
          <section className="card p-4 sm:p-5">
            <h2 className="text-card">{t("workout.choose")}</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{t("workout.chooseHint")}</p>
            <div className="mt-3 space-y-2">
              {EXERCISE_META.map(({ id, icon: Icon, labelKey, descKey }) => {
                const active = exercise === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => setExercise(id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-emerald/45 bg-emerald/8"
                        : "border-line bg-surface-2/30 hover:border-line-strong"
                    } ${busy ? "opacity-70" : ""}`}
                  >
                    <span
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                        active ? "bg-gradient-to-br from-emerald to-cyan text-[#052019]" : "bg-surface-2 text-ink-soft"
                      }`}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">{t(labelKey)}</span>
                      <span className="block text-[10.5px] text-ink-mute">{t(descKey)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-bold text-emerald">{t("workout.reward")}</span>
                      <span className="block text-[10px] text-ink-mute">
                        {EXERCISES[id].requiredReps} {t("workout.reps")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/12 text-amber">
                <Sparkles size={15} />
              </span>
              <h2 className="text-[13.5px] font-bold">{t("workout.streakNote")}</h2>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-2/50 p-2.5">
                <p className="font-display text-[19px] font-extrabold">{state.streak}</p>
                <p className="mt-0.5 text-[10px] text-ink-mute">{t("pet.streak")}</p>
              </div>
              <div className="rounded-xl bg-surface-2/50 p-2.5">
                <p className="font-display text-[19px] font-extrabold">{state.energy}</p>
                <p className="mt-0.5 text-[10px] text-ink-mute">{t("pet.energy")}</p>
              </div>
              <div className="rounded-xl bg-surface-2/50 p-2.5">
                <p className="font-display text-[19px] font-extrabold">{state.workouts.length}</p>
                <p className="mt-0.5 text-[10px] text-ink-mute">{t("workout.logTitle")}</p>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-mute">
              <ShieldCheck size={13} className="mt-0.5 flex-none text-emerald" />
              {t("workout.privacy")}
            </p>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-bold">{t("workout.logTitle")}</h2>
              <Timer size={14} className="text-ink-mute" />
            </div>
            {state.workouts.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line p-3 text-[11.5px] leading-relaxed text-ink-mute">
                {t("workout.logEmpty")}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {state.workouts.slice(0, 4).map((log) => (
                  <li key={log.id} className="flex items-center gap-2.5 py-2">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                      <Check size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium">
                        {t(`workout.ex.${log.exercise}`)} · {log.reps}
                      </p>
                      <p className="text-[10px] text-ink-mute">
                        {relativeTime(t, log.at)} · +{Math.round(log.rewardSeconds / 60)} {t("common.minutes")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <BreathingOverlay
        open={giveUpOpen}
        mode="giveUp"
        streak={state.streak}
        onKeepGoing={() => setGiveUpOpen(false)}
        onExit={finishExit}
      />

    </div>
  );
}
