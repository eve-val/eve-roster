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
  isSynthetic: boolean;
  job: Job | null;
}

export interface Log {
  id: number;
  task: string;
  result: "failure" | "success" | "partial";
  start: number;
  end: number;
}
