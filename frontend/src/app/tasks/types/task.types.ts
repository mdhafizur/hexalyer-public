export interface Task {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  due_date?: string;
  tags?: string[];
  assigned_to?: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

export interface TaskFilters {
  search?: string;
  priority?: "low" | "medium" | "high";
  completed?: boolean;
  due_date_range?: [string, string];
  tags?: string[];
  assigned_to?: string;
}
