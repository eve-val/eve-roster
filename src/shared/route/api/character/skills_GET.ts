export interface Character_Skills_GET {
  skills: CharacterSkillJson[];
  // Only present if account can read this character's skill queue
  queue?: {
    entries: QueueEntryJson[];
    completed: CompletedQueueEntryJson[];
    durationLabel: string | null;
  };
  // Only present if there was a problem when requesting the data
  warning?: string;
}

export interface CharacterSkillJson {
  id: number;
  name: string;
  group: number | null;
  level: number;
  sp: number;
}

export interface QueueEntryJson {
  id: number;
  targetLevel: number;
  proportionalStart: number;
  proportionalEnd: number;
  durationLabel: string;
  eta: string;
  endTime: number;
  progress: number;
}

export interface CompletedQueueEntryJson {
  id: number;
  completed: number;
}
