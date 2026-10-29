/**
 * Rep counting and form checking from MediaPipe pose landmarks.
 *
 * Kept dependency-free and browser-free: everything is plain geometry over the
 * 33 pose landmarks, so the counting rules can be tested without a camera.
 * Angles are measured in 2D because a webcam gives a frontal-ish view and
 * single-camera depth is noisy.
 *
 * A rep counts only when the working joint reaches the bottom threshold and
 * returns past the top threshold, and no form fault happened during the
 * movement. That stops half-reps and arched push-ups from earning time.
 */

export type ExerciseId = "pushup" | "squat" | "jumpingjack";

export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

export type FormFault = "notVisible" | "sagging" | "piking" | "shallow" | "armsDown";

export interface ExerciseConfig {
  id: ExerciseId;
  /** Reps required to unlock the reward. */
  requiredReps: number;
  /** Seconds added to the daily budget. */
  rewardSeconds: number;
  /** Energy points added to the pet. */
  energy: number;
}

export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  pushup: { id: "pushup", requiredReps: 15, rewardSeconds: 30 * 60, energy: 20 },
  squat: { id: "squat", requiredReps: 20, rewardSeconds: 30 * 60, energy: 20 },
  jumpingjack: {
    id: "jumpingjack",
    requiredReps: 20,
    rewardSeconds: 30 * 60,
    energy: 20,
  },
};

export const EXERCISE_IDS: ExerciseId[] = ["pushup", "squat", "jumpingjack"];

/** MediaPipe pose landmark indices used below. */
export const POSE = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const MIN_VISIBILITY = 0.5;
const PUSHUP_DOWN = 100;
const PUSHUP_UP = 155;
const SQUAT_DOWN = 105;
const SQUAT_UP = 162;
/** Ankles further apart than shoulder width × this counts as "feet open". */
const JJ_OPEN_RATIO = 1.55;
const JJ_CLOSED_RATIO = 1.2;

export function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magA = Math.hypot(abx, aby);
  const magC = Math.hypot(cbx, cby);
  if (magA === 0 || magC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function visibility(point: Landmark | undefined): number {
  return point?.visibility ?? 1;
}

function offsetFromLine(a: Landmark, b: Landmark, p: Landmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

export interface EvaluatedFrame {
  /** Working joint angle (elbow, knee); null for jumping jacks. */
  angle: number | null;
  /** Straightness of the shoulder–hip–ankle line, push-ups only. */
  bodyAngle: number | null;
  /** Ankle distance normalised by shoulder width, jumping jacks only. */
  spread: number | null;
  /** Both wrists above both shoulders. */
  armsUp: boolean;
  visible: boolean;
  faults: FormFault[];
}

export function evaluateFrame(
  exercise: ExerciseId,
  landmarks: Landmark[] | null,
): EvaluatedFrame | null {
  if (!landmarks || landmarks.length < 29) return null;

  if (exercise === "jumpingjack") {
    const needed = [
      POSE.leftShoulder,
      POSE.rightShoulder,
      POSE.leftWrist,
      POSE.rightWrist,
      POSE.leftHip,
      POSE.rightHip,
      POSE.leftAnkle,
      POSE.rightAnkle,
    ].map((index) => landmarks[index]);
    const visible = needed.every(
      (point) => point !== undefined && visibility(point) >= MIN_VISIBILITY,
    );
    if (!visible) {
      return {
        angle: null,
        bodyAngle: null,
        spread: null,
        armsUp: false,
        visible: false,
        faults: ["notVisible"],
      };
    }

    const shoulderWidth = Math.hypot(
      landmarks[POSE.leftShoulder].x - landmarks[POSE.rightShoulder].x,
      landmarks[POSE.leftShoulder].y - landmarks[POSE.rightShoulder].y,
    );
    const ankleDistance = Math.hypot(
      landmarks[POSE.leftAnkle].x - landmarks[POSE.rightAnkle].x,
      landmarks[POSE.leftAnkle].y - landmarks[POSE.rightAnkle].y,
    );
    const spread = ankleDistance / Math.max(shoulderWidth, 0.02);
    const armsUp =
      landmarks[POSE.leftWrist].y < landmarks[POSE.leftShoulder].y + 0.02 &&
      landmarks[POSE.rightWrist].y < landmarks[POSE.rightShoulder].y + 0.02;

    return {
      angle: null,
      bodyAngle: null,
      spread,
      armsUp,
      visible: true,
      faults: [],
    };
  }

  const leftScore =
    visibility(landmarks[POSE.leftShoulder]) +
    visibility(landmarks[POSE.leftElbow]) +
    visibility(landmarks[POSE.leftWrist]) +
    visibility(landmarks[POSE.leftHip]) +
    visibility(landmarks[POSE.leftKnee]) +
    visibility(landmarks[POSE.leftAnkle]);
  const rightScore =
    visibility(landmarks[POSE.rightShoulder]) +
    visibility(landmarks[POSE.rightElbow]) +
    visibility(landmarks[POSE.rightWrist]) +
    visibility(landmarks[POSE.rightHip]) +
    visibility(landmarks[POSE.rightKnee]) +
    visibility(landmarks[POSE.rightAnkle]);
  const left = leftScore >= rightScore;

  const shoulder = landmarks[left ? POSE.leftShoulder : POSE.rightShoulder];
  const elbow = landmarks[left ? POSE.leftElbow : POSE.rightElbow];
  const wrist = landmarks[left ? POSE.leftWrist : POSE.rightWrist];
  const hip = landmarks[left ? POSE.leftHip : POSE.rightHip];
  const knee = landmarks[left ? POSE.leftKnee : POSE.rightKnee];
  const ankle = landmarks[left ? POSE.leftAnkle : POSE.rightAnkle];

  const required = [shoulder, elbow, wrist, hip, knee, ankle];
  const visible = required.every(
    (point) => point !== undefined && visibility(point) >= MIN_VISIBILITY,
  );

  const angle =
    exercise === "pushup"
      ? angleBetween(shoulder, elbow, wrist)
      : angleBetween(hip, knee, ankle);

  if (!visible) {
    return {
      angle,
      bodyAngle: null,
      spread: null,
      armsUp: false,
      visible: false,
      faults: ["notVisible"],
    };
  }

  const faults: FormFault[] = [];
  const bodyAngle = exercise === "pushup" ? angleBetween(shoulder, hip, ankle) : null;

  if (exercise === "pushup" && bodyAngle !== null && bodyAngle < 148) {
    const side = offsetFromLine(shoulder, ankle, hip);
    faults.push(side >= 0 ? "sagging" : "piking");
  }

  return { angle, bodyAngle, spread: null, armsUp: false, visible: true, faults };
}

export type RepPhase = "top" | "bottom" | "open" | "closed";

export interface CounterState {
  reps: number;
  /** Reps that moved but were not counted because the form failed. */
  rejected: number;
  phase: RepPhase;
  /** Smoothed working angle, null before the first visible frame. */
  angle: number | null;
  spread: number | null;
  faults: FormFault[];
  done: boolean;
}

/**
 * State machine turning frames into counted reps.
 * Push-ups/squats use a joint-angle hysteresis loop. Jumping jacks use an
 * open/closed hysteresis loop on the ankle spread, and require the arms to be
 * overhead when the feet open.
 */
export class RepCounter {
  readonly exercise: ExerciseId;
  readonly config: ExerciseConfig;

  private smoothed: number | null = null;
  private smoothedSpread: number | null = null;
  private phase: RepPhase;
  private repFaults = new Set<FormFault>();
  private reachedBottom = false;
  private reps = 0;
  private rejected = 0;

  constructor(exercise: ExerciseId) {
    this.exercise = exercise;
    this.config = EXERCISES[exercise];
    this.phase = exercise === "jumpingjack" ? "closed" : "top";
  }

  push(frame: EvaluatedFrame | null): CounterState {
    if (!frame || !frame.visible) {
      return this.state(["notVisible"]);
    }

    if (this.exercise === "jumpingjack") {
      return this.pushJumpingJack(frame);
    }

    if (frame.angle === null) return this.state(["notVisible"]);

    this.smoothed =
      this.smoothed === null
        ? frame.angle
        : this.smoothed * 0.65 + frame.angle * 0.35;
    const angle = this.smoothed;

    for (const fault of frame.faults) this.repFaults.add(fault);

    const down = this.exercise === "pushup" ? PUSHUP_DOWN : SQUAT_DOWN;
    const up = this.exercise === "pushup" ? PUSHUP_UP : SQUAT_UP;

    if (this.phase === "top") {
      if (angle <= down) {
        this.phase = "bottom";
        this.reachedBottom = true;
      }
    } else if (angle >= up) {
      if (this.reachedBottom && this.repFaults.size === 0) this.reps += 1;
      else this.rejected += 1;
      this.phase = "top";
      this.reachedBottom = false;
      this.repFaults.clear();
    }

    return this.state([...this.repFaults]);
  }

  private pushJumpingJack(frame: EvaluatedFrame): CounterState {
    if (frame.spread === null) return this.state(["notVisible"]);
    this.smoothedSpread =
      this.smoothedSpread === null
        ? frame.spread
        : this.smoothedSpread * 0.6 + frame.spread * 0.4;
    const spread = this.smoothedSpread;

    if (this.phase === "closed") {
      if (spread >= JJ_OPEN_RATIO) {
        this.phase = "open";
        this.reachedBottom = true;
        if (!frame.armsUp) this.repFaults.add("armsDown");
      }
    } else if (spread <= JJ_CLOSED_RATIO) {
      if (this.reachedBottom && this.repFaults.size === 0) this.reps += 1;
      else this.rejected += 1;
      this.phase = "closed";
      this.reachedBottom = false;
      this.repFaults.clear();
    }

    return this.state([]);
  }

  private state(faults: FormFault[]): CounterState {
    return {
      reps: this.reps,
      rejected: this.rejected,
      phase: this.phase,
      angle: this.smoothed,
      spread: this.smoothedSpread,
      faults: faults.length > 0 ? faults : [],
      done: this.reps >= this.config.requiredReps,
    };
  }

  reset(): void {
    this.smoothed = null;
    this.smoothedSpread = null;
    this.phase = this.exercise === "jumpingjack" ? "closed" : "top";
    this.repFaults.clear();
    this.reachedBottom = false;
    this.reps = 0;
    this.rejected = 0;
  }
}

/**
 * Builds a landmark set for a given joint angle. Used by the offline logic
 * tests and never by the camera path.
 */
export function syntheticFrame(
  exercise: ExerciseId,
  jointAngle: number,
  options: { sag?: number; spread?: number; armsUp?: boolean } = {},
): Landmark[] {
  const points: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.99,
  }));
  const rad = (jointAngle * Math.PI) / 180;

  if (exercise === "pushup") {
    const shoulder = { x: 0.5, y: 0.4 };
    const hip = { x: 0.72, y: 0.4 + (options.sag ?? 0) };
    const ankle = { x: 0.92, y: 0.4 };
    const upper = 0.1;
    const elbow = { x: shoulder.x + upper, y: shoulder.y };
    const wrist = {
      x: elbow.x + upper * Math.cos(Math.PI - rad),
      y: elbow.y + upper * Math.sin(Math.PI - rad),
    };
    for (const index of [POSE.leftShoulder, POSE.rightShoulder]) {
      points[index] = { ...shoulder, visibility: 0.99 };
    }
    for (const index of [POSE.leftElbow, POSE.rightElbow]) {
      points[index] = { ...elbow, visibility: 0.99 };
    }
    for (const index of [POSE.leftWrist, POSE.rightWrist]) {
      points[index] = { ...wrist, visibility: 0.99 };
    }
    for (const index of [POSE.leftHip, POSE.rightHip]) {
      points[index] = { ...hip, visibility: 0.99 };
    }
    for (const index of [POSE.leftAnkle, POSE.rightAnkle]) {
      points[index] = { ...ankle, visibility: 0.99 };
    }
    points[POSE.leftKnee] = { x: 0.82, y: 0.4, visibility: 0.99 };
    points[POSE.rightKnee] = { x: 0.82, y: 0.4, visibility: 0.99 };
    return points;
  }

  if (exercise === "jumpingjack") {
    const spread = options.spread ?? 0.14;
    const shoulderY = 0.3;
    const hipY = 0.45;
    const wristY = options.armsUp === false ? 0.5 : 0.18;
    points[POSE.leftShoulder] = { x: 0.45, y: shoulderY, visibility: 0.99 };
    points[POSE.rightShoulder] = { x: 0.55, y: shoulderY, visibility: 0.99 };
    points[POSE.leftHip] = { x: 0.46, y: hipY, visibility: 0.99 };
    points[POSE.rightHip] = { x: 0.54, y: hipY, visibility: 0.99 };
    points[POSE.leftWrist] = { x: 0.4, y: wristY, visibility: 0.99 };
    points[POSE.rightWrist] = { x: 0.6, y: wristY, visibility: 0.99 };
    points[POSE.leftElbow] = { x: 0.42, y: 0.24, visibility: 0.99 };
    points[POSE.rightElbow] = { x: 0.58, y: 0.24, visibility: 0.99 };
    points[POSE.leftKnee] = { x: 0.5 - spread / 2, y: 0.65, visibility: 0.99 };
    points[POSE.rightKnee] = { x: 0.5 + spread / 2, y: 0.65, visibility: 0.99 };
    points[POSE.leftAnkle] = { x: 0.5 - spread, y: 0.85, visibility: 0.99 };
    points[POSE.rightAnkle] = { x: 0.5 + spread, y: 0.85, visibility: 0.99 };
    return points;
  }

  const hip = { x: 0.5, y: 0.35 };
  const knee = { x: 0.5, y: 0.5 };
  const swing = Math.PI - rad;
  const ankle = {
    x: knee.x + 0.14 * Math.sin(swing),
    y: knee.y + 0.14 * Math.cos(swing),
  };
  const shoulder = { x: 0.5, y: 0.2 };
  for (const index of [POSE.leftHip, POSE.rightHip]) {
    points[index] = { ...hip, visibility: 0.99 };
  }
  for (const index of [POSE.leftKnee, POSE.rightKnee]) {
    points[index] = { ...knee, visibility: 0.99 };
  }
  for (const index of [POSE.leftAnkle, POSE.rightAnkle]) {
    points[index] = { ...ankle, visibility: 0.99 };
  }
  for (const index of [POSE.leftShoulder, POSE.rightShoulder]) {
    points[index] = { ...shoulder, visibility: 0.99 };
  }
  points[POSE.leftElbow] = { x: 0.42, y: 0.28, visibility: 0.99 };
  points[POSE.rightElbow] = { x: 0.58, y: 0.28, visibility: 0.99 };
  points[POSE.leftWrist] = { x: 0.38, y: 0.36, visibility: 0.99 };
  points[POSE.rightWrist] = { x: 0.62, y: 0.36, visibility: 0.99 };
  return points;
}
