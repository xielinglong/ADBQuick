export type NotifyFn = (
  message: string,
  severity?: "success" | "info" | "warning" | "error",
) => void;

export interface Device {
  serial: string;
  state: string;
  model: string;
}

export interface CustomCommand {
  name: string;
  command: string;
}

export interface SavedFile {
  name: string;
  dir: string;
  path: string;
  kind: string;
  time: number;
}

export interface FileEntry {
  name: string;
  is_dir: boolean;
  is_symlink: boolean;
  target?: string | null;
  size: number;
  perms: string;
  owner: string;
  group: string;
  modified: string;
}
