export interface Admin_Tasks_Job_GET {
  id: number;
  task: string;
  start: number;
  end: number | null;
  result: string | null;
  logs: string[];
}
