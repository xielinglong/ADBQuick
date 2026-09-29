import { useEffect, useState } from "react";
import { Button, Select, Space, Tag, Toast } from "@douyinfe/semi-ui";
import { adbRemount, adbRoot, listDevices } from "../api";
import type { Device } from "../types";

interface Props {
  serial: string;
  onSerialChange: (s: string) => void;
}

export default function DeviceBar({ serial, onSerialChange }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const devs = await listDevices();
      setDevices(devs);
      if (devs.length > 0 && !devs.find((d) => d.serial === serial)) {
        onSerialChange(devs[0].serial);
      }
    } catch (e) {
      Toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRoot = async () => {
    if (!serial) return Toast.warning("请先选择设备");
    try {
      Toast.info(await adbRoot(serial));
    } catch (e) {
      Toast.error(String(e));
    }
  };

  const doRemount = async () => {
    if (!serial) return Toast.warning("请先选择设备");
    try {
      Toast.info(await adbRemount(serial));
    } catch (e) {
      Toast.error(String(e));
    }
  };

  const optionList = devices.map((d) => ({
    label: `${d.model || d.serial}（${d.serial}）`,
    value: d.serial,
  }));

  return (
    <Space align="center">
      <Select
        style={{ width: 280 }}
        placeholder="选择设备"
        value={serial || undefined}
        optionList={optionList}
        onChange={(v) => onSerialChange(String(v))}
      />
      <Button onClick={refresh} loading={loading}>
        刷新
      </Button>
      <Button onClick={doRoot}>Root</Button>
      <Button onClick={doRemount}>Remount</Button>
      {devices.length === 0 && !loading && <Tag color="red">无设备连接</Tag>}
    </Space>
  );
}
