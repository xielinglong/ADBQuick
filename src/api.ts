import { invoke } from "@tauri-apps/api/core";
import type { Device, FileEntry } from "./types";

export const listDevices = () => invoke<Device[]>("list_devices");

export const adbRoot = (serial: string) => invoke<string>("adb_root", { serial });

export const adbRemount = (serial: string) => invoke<string>("adb_remount", { serial });

export const listDir = (serial: string, path: string) =>
  invoke<FileEntry[]>("list_dir", { serial, path });

export const screenshot = (serial: string) => invoke<string>("screenshot", { serial });

export const logcatStart = (serial: string) => invoke<string>("logcat_start", { serial });

export const logcatStop = (serial: string) => invoke<void>("logcat_stop", { serial });
