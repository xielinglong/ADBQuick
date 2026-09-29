import { useState } from "react";
import { Button, Space, Spin, Toast } from "@douyinfe/semi-ui";
import { screenshot } from "../api";

export default function ScreenshotPanel({ serial }: { serial: string }) {
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const take = async () => {
    if (!serial) return Toast.warning("请先选择设备");
    setLoading(true);
    try {
      const b64 = await screenshot(serial);
      setImg(`data:image/png;base64,${b64}`);
    } catch (e) {
      Toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Space align="center">
        <Button theme="solid" type="primary" onClick={take} loading={loading}>
          截屏
        </Button>
        {loading && <Spin size="small" />}
      </Space>
      {img && <img className="screenshot-img" src={img} alt="screenshot" />}
    </div>
  );
}
