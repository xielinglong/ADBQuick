import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import CachedIcon from "@mui/icons-material/Cached";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import TerminalIcon from "@mui/icons-material/Terminal";
import type { CustomCommand } from "../types";

interface Props {
  commands: CustomCommand[];
  logcatRunning: boolean;
  onRoot: () => void;
  onRemount: () => void;
  onScreenshot: () => void;
  onLogcat: () => void;
  onRunCommand: (cmd: CustomCommand) => void;
  onManage: () => void;
}

export default function CommonCommands({
  commands,
  logcatRunning,
  onRoot,
  onRemount,
  onScreenshot,
  onLogcat,
  onRunCommand,
  onManage,
}: Props) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          快捷操作
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="contained" startIcon={<SecurityIcon />} onClick={onRoot}>
            Root
          </Button>
          <Button variant="contained" startIcon={<CachedIcon />} onClick={onRemount}>
            Remount
          </Button>
          <Button variant="contained" startIcon={<PhotoCameraIcon />} onClick={onScreenshot}>
            截图
          </Button>
          <Button variant="contained" startIcon={<TerminalIcon />} onClick={onLogcat}>
            {logcatRunning ? "停止日志" : "抓日志"}
          </Button>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2">自定义命令</Typography>
          <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={onManage}>
            管理命令
          </Button>
        </Stack>

        {commands.length === 0 ? (
          <Typography color="text.secondary">还没有自定义命令,点「管理命令」添加</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 1,
            }}
          >
            {commands.map((c) => (
              <Button
                key={c.name}
                variant="outlined"
                onClick={() => onRunCommand(c)}
                sx={{ justifyContent: "flex-start", textTransform: "none", p: 1.5, height: "auto" }}
              >
                <Stack sx={{ alignItems: "flex-start", width: "100%" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all", textAlign: "left" }}>
                    {c.command}
                  </Typography>
                </Stack>
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
