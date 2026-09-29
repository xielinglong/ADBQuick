import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import LinkIcon from "@mui/icons-material/Link";
import RefreshIcon from "@mui/icons-material/Refresh";
import { listDir } from "../api";
import type { FileEntry, NotifyFn } from "../types";

interface Props {
  serial: string;
  path: string;
  onNavigate: (path: string) => void;
  onNotify: NotifyFn;
}

function joinPath(parent: string, name: string): string {
  if (parent === "/") return "/" + name;
  return parent + "/" + name;
}

function parentPath(p: string): string {
  if (p === "/") return "/";
  const idx = p.lastIndexOf("/");
  if (idx <= 0) return "/";
  return p.slice(0, idx);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = -1;
  do {
    v /= 1024;
    i += 1;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function FileManager({ serial, path, onNavigate, onNotify }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (p: string) => {
      if (!serial) return;
      setLoading(true);
      try {
        const list = await listDir(serial, p);
        const sorted = [...list].sort((a, b) => {
          if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      } catch (e) {
        onNotify(String(e), "error");
      } finally {
        setLoading(false);
      }
    },
    [serial, onNotify],
  );

  useEffect(() => {
    load(path);
  }, [path, load]);

  const enter = (name: string) => onNavigate(joinPath(path, name));
  const goUp = () => path !== "/" && onNavigate(parentPath(path));

  // 面包屑
  const segs = path === "/" ? [] : path.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];
  let acc = "";
  segs.forEach((s, i) => {
    acc = i === 0 ? "/" + s : acc + "/" + s;
    crumbs.push({ label: s, path: acc });
  });

  return (
    <Box>
      <Breadcrumbs separator="/" sx={{ mb: 1 }}>
        <Button variant="text" size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => onNavigate("/")}>
          根目录
        </Button>
        {crumbs.map((c) => (
          <Button key={c.path} variant="text" size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => onNavigate(c.path)}>
            {c.label}
          </Button>
        ))}
      </Breadcrumbs>

      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Button size="small" variant="outlined" startIcon={<ArrowUpwardIcon />} onClick={goUp} disabled={path === "/"}>
          上级
        </Button>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => load(path)}>
          刷新
        </Button>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {path}
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell sx={{ width: 120 }}>权限</TableCell>
              <TableCell sx={{ width: 100 }} align="right">
                大小
              </TableCell>
              <TableCell sx={{ width: 180 }}>修改时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((r) => (
              <TableRow
                key={r.name}
                hover={r.is_dir}
                onClick={() => r.is_dir && enter(r.name)}
                sx={{ cursor: r.is_dir ? "pointer" : "default" }}
              >
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {r.is_dir ? (
                      <FolderIcon color="warning" fontSize="small" />
                    ) : r.is_symlink ? (
                      <LinkIcon color="action" fontSize="small" />
                    ) : (
                      <DescriptionIcon color="action" fontSize="small" />
                    )}
                    <span>{r.name}</span>
                    {r.is_symlink && r.target && <Chip size="small" label={`→ ${r.target}`} />}
                  </Stack>
                </TableCell>
                <TableCell>{r.perms}</TableCell>
                <TableCell align="right">{r.is_dir ? "—" : formatSize(r.size)}</TableCell>
                <TableCell>{r.modified}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: "text.secondary", py: 4 }}>
                  空目录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
