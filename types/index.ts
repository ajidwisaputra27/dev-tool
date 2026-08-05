export type Priority = 'high' | 'med' | 'low';
export type TaskStatus = 'backlog' | 'progress' | 'review' | 'done';

export interface Subtask {
  id: number;
  task_id?: number;
  text: string;
  done: boolean | number;
}

export interface Task {
  id: number;
  board_id?: number;
  text: string;
  tag?: string | null;
  priority: Priority;
  due?: string | null;
  estimate?: string | null;
  status: TaskStatus;
  git_link?: string | null;
  subtasks?: Subtask[];
}

export interface Board {
  id: number;
  name: string;
  created_at?: string;
}

export interface PomodoroSession {
  id: number;
  type: 'work' | 'break';
  duration_seconds: number;
  completed_at?: string;
}

export interface SettingsMap {
  theme?: string;
  spotifyLink?: string;
  spotifyPlaylistId?: string;
  [key: string]: string | undefined;
}

export interface SpotifyPlaylist {
  id: number;
  name: string;
  link: string;
  is_active?: number | boolean;
  created_at?: string;
}

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void | Promise<void> | string;
}
