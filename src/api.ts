import { invoke } from "@tauri-apps/api/core";
import type { CustomCommand, Device, FileEntry, SavedFile } from "./types";

export const listDevices = () => invoke<Device[]>("list_devices");

export const adbConnect = (addr: string) => invoke<string>("adb_connect", { addr });

export const adbRoot = (serial: string) => invoke<string>("adb_root", { serial });

export const adbRemount = (serial: string) => invoke<string>("adb_remount", { serial });

export const listDir = (serial: string, path: string) =>
  invoke<FileEntry[]>("list_dir", { serial, path });

export const screenshot = (serial: string) => invoke<string>("screenshot", { serial });

export const runCustom = (serial: string, command: string) =>
  invoke<string>("run_custom", { serial, command });

export const listCustomCommands = (serial: string) =>
  invoke<CustomCommand[]>("list_custom_commands", { serial });

export const saveCustomCommands = (serial: string, commands: CustomCommand[]) =>
  invoke<void>("save_custom_commands", { serial, commands });

export const listSavedFiles = (serial: string) =>
  invoke<SavedFile[]>("list_saved_files", { serial });

export const recordSavedFile = (serial: string, path: string, kind: string) =>
  invoke<SavedFile>("record_saved_file", { serial, path, kind });

export const deleteSavedFile = (serial: string, path: string) =>
  invoke<void>("delete_saved_file", { serial, path });

export const logcatStart = (serial: string) => invoke<string>("logcat_start", { serial });

export const logcatStop = (serial: string) => invoke<void>("logcat_stop", { serial });
