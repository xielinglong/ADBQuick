import { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface Props {
  text: string;
  onClear: () => void;
}

export default function OutputPanel({ text, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Paper square elevation={0} sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack
        direction="row"
        sx={{ px: 2, py: 0.5, alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="subtitle2">输出</Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            startIcon={collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          >
            {collapsed ? "展开" : "折叠"}
          </Button>
          <Button size="small" onClick={onClear} startIcon={<ClearAllIcon />}>
            清空
          </Button>
        </Stack>
      </Stack>
      {!collapsed && (
        <Box
          component="pre"
          sx={{
            m: 0,
            px: 2,
            pb: 1.5,
            maxHeight: 180,
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {text || "（暂无输出）"}
        </Box>
      )}
    </Paper>
  );
}
