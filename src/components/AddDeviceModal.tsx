import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import RefreshIcon from "@mui/icons-material/Refresh";
import { adbConnect, listDevices } from "../api";
import type { Device, NotifyFn } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  existing: string[];
  onAdd: (serial: string, model: string, online: boolean) => void;
  onNotify: NotifyFn;
}

function stateChip(state: string): { label: string; color: "default" | "success" | "warning" | "error" | "info" } {
  switch (state) {
    case "device":
      return { label: "在线", color: "success" };
    case "offline":
      return { label: "离线", color: "default" };
    case "unauthorized":
      return { label: "未授权", color: "warning" };
    case "recovery":
      return { label: "Recovery", color: "info" };
    default:
      return { label: state || "未知", color: "default" };
  }
}

export default function AddDeviceModal({ visible, onClose, existing, onAdd, onNotify }: Props) {
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState<Device[]>([]);

  // 关闭时清空列表，下次打开重新扫描
  useEffect(() => {
    if (!visible) {
      setScanned([]);
      setAddr("");
    }
  }, [visible]);

  const scan = async () => {
    setBusy(true);
    try {
      const devs = await listDevices();
      setScanned(devs);
      if (devs.length === 0) onNotify("未发现设备", "info");
    } catch (e) {
      onNotify(String(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const add = (d: Device) => {
    onAdd(d.serial, d.model || d.serial, d.state === "device");
  };

  const connect = async () => {
    const a = addr.trim();
    if (!a) {
      onNotify("请输入 IP:端口", "warning");
      return;
    }
    setBusy(true);
    try {
      const msg = await adbConnect(a);
      onNotify(msg, "success");
      onAdd(a, a, true);
      setAddr("");
    } catch (e) {
      onNotify(String(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>添加设备</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={scan}
            disabled={busy}
            sx={{ alignSelf: "flex-start" }}
          >
            扫描已连设备
          </Button>

          {scanned.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                发现的设备（点击添加）
              </Typography>
              <List
                dense
                disablePadding
                sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 260, overflow: "auto" }}
              >
                {scanned.map((d) => {
                  const added = existing.includes(d.serial);
                  const st = stateChip(d.state);
                  return (
                    <ListItemButton key={d.serial} divider disabled={added} onClick={() => add(d)}>
                      <ListItemIcon>
                        <PhoneAndroidIcon color={added ? "disabled" : "action"} />
                      </ListItemIcon>
                      <ListItemText
                        primary={d.model || d.serial}
                        secondary={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{d.serial}</span>}
                      />
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <Chip size="small" label={st.label} color={st.color} variant="outlined" />
                        {added && <Chip size="small" label="已添加" color="success" variant="outlined" />}
                      </Stack>
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          )}

          <Divider />

          <Typography variant="body2" color="text.secondary">
            或手动连接网络设备（adb connect）：
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="例如 192.168.1.100:5555"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") connect();
              }}
            />
            <Button variant="contained" onClick={connect} disabled={busy}>
              连接
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
