import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, CssBaseline, IconButton, Snackbar, Tab, Tabs, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import UsbIcon from "@mui/icons-material/Usb";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  adbRemount,
  adbRoot,
  deleteSavedFile,
  listCustomCommands,
  listDevices,
  listSavedFiles,
  logcatStart,
  logcatStop,
  recordSavedFile,
  runCustom,
  saveCustomCommands,
  screenshot,
} from "./api";
import AddDeviceModal from "./components/AddDeviceModal";
import CommandManager from "./components/CommandManager";
import CommonCommands from "./components/CommonCommands";
import FileManager from "./components/FileManager";
import OutputPanel from "./components/OutputPanel";
import SavedFiles from "./components/SavedFiles";
import type { CustomCommand, NotifyFn, SavedFile } from "./types";

const ADD_KEY = "__add__";

type Severity = "success" | "info" | "warning" | "error";
type SubPage = "commands" | "files" | "saved";

interface TabItem {
  serial: string;
  model: string;
  online: boolean;
}

function OfflineHint() {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <CloudOffIcon sx={{ fontSize: 48, color: "text.disabled" }} />
      <Typography color="text.secondary">设备已离线</Typography>
      <Typography variant="caption" color="text.disabled">
        设备未连接或不在线,无法查看此页面
      </Typography>
    </Box>
  );
}

export default function App() {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [active, setActive] = useState("");
  const [subPage, setSubPage] = useState<SubPage>("commands");
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [commands, setCommands] = useState<Record<string, CustomCommand[]>>({});
  const [savedFiles, setSavedFiles] = useState<Record<string, SavedFile[]>>({});
  const [logcatRunning, setLogcatRunning] = useState<Record<string, boolean>>({});
  const [logcatPath, setLogcatPath] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: Severity }>({
    open: false,
    message: "",
    severity: "info",
  });
  const loadedRef = useRef<Set<string>>(new Set());

  const appendOutput = (text: string) =>
    setOutput((prev) => (prev ? `${prev}\n${text}` : text));

  const notify: NotifyFn = useCallback((message, severity = "info") => {
    setSnack({ open: true, message, severity });
  }, []);

  const loadConfig = useCallback(
    async (serial: string) => {
      try {
        const [cmds, files] = await Promise.all([
          listCustomCommands(serial),
          listSavedFiles(serial),
        ]);
        setCommands((prev) => ({ ...prev, [serial]: cmds }));
        setSavedFiles((prev) => ({ ...prev, [serial]: files }));
      } catch (e) {
        notify(String(e), "error");
      }
    },
    [notify],
  );

  const refreshSaved = useCallback(
    async (serial: string) => {
      try {
        const files = await listSavedFiles(serial);
        setSavedFiles((prev) => ({ ...prev, [serial]: files }));
      } catch (e) {
        notify(String(e), "error");
      }
    },
    [notify],
  );

  // 首次扫描已连接设备
  useEffect(() => {
    (async () => {
      try {
        const devs = await listDevices();
        if (devs.length > 0) {
          const items = devs.map((d) => ({
            serial: d.serial,
            model: d.model || d.serial,
            online: d.state === "device",
          }));
          setTabs(items);
          setActive(items[0].serial);
        }
      } catch (e) {
        notify(String(e), "error");
      }
    })();
  }, [notify]);

  // 周期刷新在线状态
  useEffect(() => {
    const refresh = async () => {
      try {
        const devs = await listDevices();
        const online = new Set(devs.filter((d) => d.state === "device").map((d) => d.serial));
        setTabs((prev) => prev.map((t) => ({ ...t, online: online.has(t.serial) })));
      } catch {
        /* 忽略轮询错误 */
      }
    };
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, []);

  // 激活设备时懒加载其配置
  useEffect(() => {
    if (active && !loadedRef.current.has(active)) {
      loadedRef.current.add(active);
      loadConfig(active);
    }
  }, [active, loadConfig]);

  const activeDevice = tabs.find((t) => t.serial === active);
  const online = activeDevice?.online ?? false;

  const navigate = (p: string) => setPaths((prev) => ({ ...prev, [active]: p }));

  const addTab = (serial: string, model: string, isOnline: boolean) => {
    setTabs((prev) =>
      prev.some((t) => t.serial === serial) ? prev : [...prev, { serial, model, online: isOnline }],
    );
    setActive(serial);
  };

  const closeTab = (serial: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.serial !== serial);
      if (active === serial) setActive(next[0]?.serial ?? "");
      return next;
    });
  };

  const guard = () => {
    if (!active) {
      notify("请先添加设备", "warning");
      return false;
    }
    if (!online) {
      notify("设备已离线", "warning");
      return false;
    }
    return true;
  };

  const doRoot = async () => {
    if (!guard()) return;
    try {
      appendOutput(`[root] ${await adbRoot(active)}`);
    } catch (e) {
      appendOutput(`[root 失败] ${e}`);
    }
  };

  const doRemount = async () => {
    if (!guard()) return;
    try {
      appendOutput(`[remount] ${await adbRemount(active)}`);
    } catch (e) {
      appendOutput(`[remount 失败] ${e}`);
    }
  };

  const doScreenshot = async () => {
    if (!guard()) return;
    try {
      const p = await screenshot(active);
      await recordSavedFile(active, p, "image");
      await refreshSaved(active);
      appendOutput(`[截图] 已保存: ${p}`);
      notify("截图已保存", "success");
    } catch (e) {
      appendOutput(`[截图失败] ${e}`);
      notify(String(e), "error");
    }
  };

  const doLogcat = async () => {
    if (!guard()) return;
    if (logcatRunning[active]) {
      try {
        await logcatStop(active);
        const p = logcatPath[active];
        if (p) {
          await recordSavedFile(active, p, "log");
          await refreshSaved(active);
        }
        setLogcatRunning((prev) => ({ ...prev, [active]: false }));
        setLogcatPath((prev) => {
          const n = { ...prev };
          delete n[active];
          return n;
        });
        appendOutput("[logcat] 已停止");
      } catch (e) {
        appendOutput(`[logcat 停止失败] ${e}`);
      }
    } else {
      try {
        const p = await logcatStart(active);
        setLogcatRunning((prev) => ({ ...prev, [active]: true }));
        setLogcatPath((prev) => ({ ...prev, [active]: p }));
        appendOutput(`[logcat] 抓取中: ${p}`);
      } catch (e) {
        appendOutput(`[logcat 启动失败] ${e}`);
      }
    }
  };

  const runCommand = async (cmd: CustomCommand) => {
    if (!guard()) return;
    appendOutput(`$ ${cmd.command}`);
    try {
      appendOutput(await runCustom(active, cmd.command));
    } catch (e) {
      appendOutput(`(错误) ${e}`);
    }
  };

  const openFile = async (path: string) => {
    try {
      await revealItemInDir(path);
    } catch {
      try {
        const dir = path.replace(/[\\/][^\\/]*$/, "");
        await openPath(dir);
      } catch (e) {
        notify(String(e), "error");
      }
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await deleteSavedFile(active, path);
      await refreshSaved(active);
      notify("已删除", "success");
    } catch (e) {
      notify(String(e), "error");
    }
  };

  const renderContent = () => {
    if (subPage === "commands") {
      if (!online) return <OfflineHint />;
      return (
        <CommonCommands
          commands={commands[active] ?? []}
          logcatRunning={!!logcatRunning[active]}
          onRoot={doRoot}
          onRemount={doRemount}
          onScreenshot={doScreenshot}
          onLogcat={doLogcat}
          onRunCommand={runCommand}
          onManage={() => setCmdOpen(true)}
        />
      );
    }
    if (subPage === "files") {
      if (!online) return <OfflineHint />;
      return (
        <FileManager serial={active} path={paths[active] ?? "/"} onNavigate={navigate} onNotify={notify} />
      );
    }
    return <SavedFiles files={savedFiles[active] ?? []} onOpen={openFile} onDelete={handleDelete} />;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <CssBaseline />

      {/* 顶部:设备 Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1, pt: 0.5 }}>
        <Tabs
          value={active || false}
          onChange={(_, k) => (k === ADD_KEY ? setAddOpen(true) : setActive(k))}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40 }}
        >
          {tabs.map((t) => (
            <Tab
              key={t.serial}
              value={t.serial}
              label={
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: t.online ? "success.main" : "text.disabled",
                    }}
                  />
                  <span>{t.model || t.serial}</span>
                  <IconButton
                    component="span"
                    size="small"
                    aria-label="关闭"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.serial);
                    }}
                    sx={{ p: 0, ml: 0.5 }}
                  >
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              }
              sx={{ minHeight: 40, textTransform: "none" }}
            />
          ))}
          <Tab value={ADD_KEY} icon={<AddIcon />} aria-label="添加设备" sx={{ minWidth: 40, minHeight: 40 }} />
        </Tabs>
      </Box>

      {activeDevice ? (
        <>
          {/* 子导航:常用命令 / 文件管理器 / 已保存 */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <Tabs
              value={subPage}
              onChange={(_, k) => setSubPage(k as SubPage)}
              variant="fullWidth"
              sx={{ minHeight: 36 }}
            >
              <Tab value="commands" label="常用命令" sx={{ minHeight: 36, textTransform: "none" }} />
              <Tab value="files" label="文件管理器" sx={{ minHeight: 36, textTransform: "none" }} />
              <Tab value="saved" label="已保存" sx={{ minHeight: 36, textTransform: "none" }} />
            </Tabs>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>{renderContent()}</Box>
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <UsbIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography color="text.secondary">暂无设备,点击右上角 ＋ 添加设备</Typography>
        </Box>
      )}

      <OutputPanel text={output} onClear={() => setOutput("")} />

      <AddDeviceModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existing={tabs.map((t) => t.serial)}
        onAdd={addTab}
        onNotify={notify}
      />
      <CommandManager
        visible={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={commands[active] ?? []}
        onChange={(cmds) => setCommands((prev) => ({ ...prev, [active]: cmds }))}
        onSave={async (next) => {
          await saveCustomCommands(active, next);
          setCommands((prev) => ({ ...prev, [active]: next }));
        }}
        onNotify={notify}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
