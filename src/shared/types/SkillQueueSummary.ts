export type DataFreshness = "fresh" | "cached";
export type QueueStatus = "empty" | "paused" | "active";
export type WarningType = "bad_credentials" | "fetch_failure";

export interface Queue {
  count: number;
  timeRemaining: string | null;
}

export interface Skill {
  name: string;
  progress: number;
  timeRemaining: string | null;
}

export interface SkillQueueSummary {
  dataFreshness: DataFreshness;
  queueStatus: QueueStatus;
  skillInTraining: null | Skill;
  queue: Queue;
  warning?: WarningType;
}
