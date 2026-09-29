export interface Device {
  serial: string;
  state: string;
  model: string;
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
