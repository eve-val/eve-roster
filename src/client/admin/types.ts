export interface Job {
  id: number;
  task: string;
  startTime: number;
  processed?: boolean;
  progress: number | null;
  progressLabel: string | null;
}

export interface Task {
  name: string;
  displayName: string;
  description: string;
  isSynthetic?: boolean;
  job: Job | null;
}

export interface Log {
  id: number;
  task: string;
  result: "failure" | "success" | "partial";
  start: number;
  end: number;
}

type CitadelType =
  | "Astrahus"
  | "Fortizar"
  | "Keepstar"
  | "Raitaru"
  | "Azbel"
  | "Sotiyo"
  | "Athanor"
  | "Tatara";

export interface Citadel {
  id: number | null;
  name: string;
  type: CitadelType;
  allianceAccess: boolean;
  allianceOwned: boolean;
}
