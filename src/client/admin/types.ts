export type Job = {
  id: number;
  task: string;
  startTime: number;
  processed: boolean;
  progress: number | null;
  progressLabel: string | null;
};

export type Task = {
  name: string;
  displayName: string;
  description: string;
  isSynthetic: boolean;
  job: Job | null;
};
