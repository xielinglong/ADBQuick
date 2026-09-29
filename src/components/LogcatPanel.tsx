import { useState } from "react";
import { Button, Space, Tag, Toast } from "@douyinfe/semi-ui";
import { logcatStart, logcatStop } from "../api";

export default function LogcatPanel({ serial }: { serial: string }) {
  const [running, setRunning] = useState(false);
  const [file, setFile] = useState<string | null>(null);

  const start = async () => {
    if (!serial) return Toast.warning("请先选择设备");
    try {
      const p = await logcatStart(serial);
      setFile(p);
      setRunning(true);
      Toast.success("开始抓取 logcat");
    } catch (e) {
      Toast.error(String(e));
    }
  };

  const stop = async () => {
    if (!serial) return;
    try {
      await logcatStop(serial);
      setRunning(false);
      Toast.success("已停止抓取");
    } catch (e) {
      Toast.error(String(e));
    }
  };

  return (
    <div>
      <Space align="center">
        <Button theme="solid" type="primary" onClick={start} disabled={running}>
          开始抓取
        </Button>
        <Button type="danger" onClick={stop} disabled={!running}>
          停止
        </Button>
        <Tag color={running ? "green" : "grey"}>{running ? "抓取中…" : "未抓取"}</Tag>
      </Space>
      {file && (
        <p style={{ marginTop: 16, wordBreak: "break-all" }}>
          日志文件：<code>{file}</code>
        </p>
      )}
    </div>
  );
}
