import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import MovieIcon from "@mui/icons-material/Movie";
import TerminalIcon from "@mui/icons-material/Terminal";
import type { SavedFile } from "../types";

interface Props {
  files: SavedFile[];
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
}

function kindIcon(kind: string) {
  switch (kind) {
    case "image":
      return <ImageIcon color="primary" fontSize="small" />;
    case "video":
      return <MovieIcon color="secondary" fontSize="small" />;
    case "log":
      return <TerminalIcon color="success" fontSize="small" />;
    default:
      return <InsertDriveFileIcon color="action" fontSize="small" />;
  }
}

function formatTime(t: number) {
  if (!t) return "—";
  return new Date(t * 1000).toLocaleString();
}

export default function SavedFiles({ files, onOpen, onDelete }: Props) {
  const [pending, setPending] = useState<SavedFile | null>(null);

  return (
    <Box>
      {files.length === 0 ? (
        <Stack sx={{ alignItems: "center", py: 6, gap: 0.5 }}>
          <Typography color="text.secondary">暂无已保存的文件</Typography>
          <Typography variant="caption" color="text.disabled">
            截图 / 抓日志等操作保存到本地的文件会显示在这里
          </Typography>
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>文件名</TableCell>
                <TableCell sx={{ width: 170 }}>时间</TableCell>
                <TableCell>保存到本地的目录</TableCell>
                <TableCell sx={{ width: 100 }} align="right">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.path} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {kindIcon(f.kind)}
                      <span>{f.name}</span>
                    </Stack>
                  </TableCell>
                  <TableCell>{formatTime(f.time)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all", fontSize: 12 }}>
                      {f.dir}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="打开所在目录">
                      <IconButton size="small" onClick={() => onOpen(f.path)}>
                        <FolderOpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除文件">
                      <IconButton size="small" color="error" onClick={() => setPending(f)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(pending)} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>删除文件</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定删除「{pending?.name}」吗?该文件及其记录将从本地移除。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (pending) onDelete(pending.path);
              setPending(null);
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
