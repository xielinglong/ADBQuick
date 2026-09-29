import { useState } from "react";
import { Empty, Layout, Nav, Space, Typography } from "@douyinfe/semi-ui";
import DeviceBar from "./components/DeviceBar";
import FileManager from "./components/FileManager";
import LogcatPanel from "./components/LogcatPanel";
import ScreenshotPanel from "./components/ScreenshotPanel";
import "./App.css";

const { Header, Sider, Content } = Layout;

const NAV_ITEMS = [
  { itemKey: "files", text: "📁 文件管理" },
  { itemKey: "screenshot", text: "📷 截图" },
  { itemKey: "logcat", text: "📋 Logcat" },
];

export default function App() {
  const [serial, setSerial] = useState("");
  const [active, setActive] = useState("files");

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider>
        <Nav
          items={NAV_ITEMS}
          selectedKeys={[active]}
          onSelect={({ itemKey }) => setActive(String(itemKey))}
          style={{ height: "100%" }}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Title heading={4} style={{ margin: 0 }}>
              ADBQuick
            </Typography.Title>
            <DeviceBar serial={serial} onSerialChange={setSerial} />
          </Space>
        </Header>
        <Content className="app-content">
          {!serial ? (
            <Empty title="暂无设备" description="请先在右上角选择一台已连接的设备" />
          ) : (
            <>
              {active === "files" && <FileManager serial={serial} />}
              {active === "screenshot" && <ScreenshotPanel serial={serial} />}
              {active === "logcat" && <LogcatPanel serial={serial} />}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
