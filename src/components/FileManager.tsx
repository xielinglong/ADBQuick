import { Fragment, useCallback, useEffect, useState } from "react";
import { Button, Space, Spin, Table, Tag, Toast } from "@douyinfe/semi-ui";
import { listDir } from "../api";
import type { FileEntry } from "../types";

interface Props {
  serial: string;
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

export default function FileManager({ serial }: Props) {
  const [path, setPath] = useState("/");
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
        Toast.error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [serial],
  );

  useEffect(() => {
    load(path);
  }, [path, load]);

  const enter = (name: string) => setPath(joinPath(path, name));
  const goUp = () => path !== "/" && setPath(parentPath(path));

  // 面包屑
  const segs = path === "/" ? [] : path.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];
  let acc = "";
  segs.forEach((s, i) => {
    acc = i === 0 ? "/" + s : acc + "/" + s;
    crumbs.push({ label: s, path: acc });
  });

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      render: (_t: unknown, r: FileEntry) => (
        <Space>
          <span>{r.is_dir ? "📁" : r.is_symlink ? "🔗" : "📄"}</span>
          <span>{r.name}</span>
          {r.is_symlink && r.target && <Tag size="small">→ {r.target}</Tag>}
        </Space>
      ),
    },
    { title: "权限", dataIndex: "perms", width: 120 },
    {
      title: "大小",
      dataIndex: "size",
      width: 100,
      render: (v: number, r: FileEntry) => (r.is_dir ? "—" : formatSize(v)),
    },
    { title: "修改时间", dataIndex: "modified", width: 180 },
  ];

  return (
    <div>
      <div className="breadcrumb">
        <span className="crumb" onClick={() => setPath("/")}>
          根目录
        </span>
        {crumbs.map((c) => (
          <Fragment key={c.path}>
            <span className="sep">/</span>
            <span className="crumb" onClick={() => setPath(c.path)}>
              {c.label}
            </span>
          </Fragment>
        ))}
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Button onClick={goUp} disabled={path === "/"}>
          ⬆ 上级
        </Button>
        <Button onClick={() => load(path)}>刷新</Button>
        <span style={{ color: "var(--semi-color-text-2)", fontSize: 13 }}>{path}</span>
      </Space>

      <Spin spinning={loading}>
        <Table
          size="small"
          columns={columns}
          dataSource={entries}
          rowKey="name"
          pagination={false}
          onRow={(record) => ({
            onClick: () => record?.is_dir && enter(record.name),
            style: { cursor: record?.is_dir ? "pointer" : "default" },
          })}
        />
      </Spin>
    </div>
  );
}
