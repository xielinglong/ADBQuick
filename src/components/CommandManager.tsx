import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { CustomCommand, NotifyFn } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  commands: CustomCommand[];
  onChange: (cmds: CustomCommand[]) => void;
  onSave: (cmds: CustomCommand[]) => Promise<void>;
  onNotify: NotifyFn;
}

export default function CommandManager({ visible, onClose, commands, onChange, onSave, onNotify }: Props) {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [saving, setSaving] = useState(false);

  const add = () => {
    if (!name.trim() || !command.trim()) {
      onNotify("名称和命令都不能为空", "warning");
      return;
    }
    if (commands.some((c) => c.name === name.trim())) {
      onNotify("名称已存在", "warning");
      return;
    }
    onChange([...commands, { name: name.trim(), command: command.trim() }]);
    setName("");
    setCommand("");
  };

  const remove = (n: string) => onChange(commands.filter((c) => c.name !== n));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(commands);
      onNotify("已保存", "success");
      onClose();
    } catch (e) {
      onNotify(String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>管理自定义命令</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="命令名称"
              placeholder="如:查看系统版本"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ width: 180 }}
            />
            <TextField
              size="small"
              label="adb 命令"
              placeholder="如:shell getprop ro.build.version.release"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              fullWidth
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={add}>
              添加
            </Button>
          </Stack>

          <Divider />

          <Box sx={{ maxHeight: 260, overflow: "auto" }}>
            {commands.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                还没有自定义命令
              </Typography>
            )}
            {commands.map((c) => (
              <Stack
                key={c.name}
                direction="row"
                spacing={1}
                sx={{
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {c.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "monospace", color: "text.secondary", wordBreak: "break-all" }}
                  >
                    {c.command}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => remove(c.name)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          保存并关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
