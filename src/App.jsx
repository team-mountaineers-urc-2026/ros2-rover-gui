import React, { useState, useEffect } from "react";
import { BrowserRouter as Router} from "react-router-dom";
import DebugPanel from "./components/Misc/DebugPanel";
import { DebugProvider, DebugContext } from "./components/Misc/DebugContext";
import NavBar from "./components/Misc/NavBar";
import { ThemeProvider } from "./components/Themes/ThemeContext.js";
import Cameras from "./components/Cameras/Cameras";
import Home from "./components/Home";
import MapPage from "./components/Map/Map";
import SciencePage from "./components/Science/Science";
import ResetMotor from "./components/Misc/ResetMotor"
import ArmDebug from "./components/Manipulator/ArmDebug";
import GimbalControl from "./components/Misc/GimbalControl";
import BellyGimbalControl from "./components/Misc/BellyGimbalControl";
import PoseData from "./components/Misc/PoseData";
import ScreenshotTool from './components/Misc/ScreenshotTool';
import ForceSensor from "./components/Misc/ForceSensor";
import LimitSwitches from "./components/Misc/LimitSwitches";
import { useContext } from "react";
import { TelemetryProvider } from "./components/Misc/TelemetryContext";
import { useLocation } from "react-router-dom";
import ManipulatorPage from "./components/Manipulator/ManipulatorPage";
import { AmpProvider } from './components/Manipulator/AmpContext';
import SidebarAmpsDisplay from "./components/Manipulator/SidebarAmpsDisplay";
import CollapsibleWrapper from "./components/Misc/CollapsibleWrapper.jsx";
import RailPositionDisplay from "./components/Manipulator/RailPositionDisplay.jsx";

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    overflow: "auto",
    backgroundColor: "var(--bg-main)",
    color: "var(--text-primary)",
  },
  leftSidebar: {
    width: "40px",
    backgroundColor: "var(--bg-sidebar-left)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: "5px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  homeGroup: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "100%",
  },
  rightSidebar: {
    backgroundColor: "var(--bg-sidebar-right)",
    color: "var(--text-primary)",
    display: "block",
    padding: "5px",
    width: "300px",
    height: "100vh",
    overflowY: "auto",
    zIndex: 10,
  },
  motorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(2, 1fr)",
    gap: "10px",
  },
  manipulatorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(2, 1fr)",
    gap: "10px",
  },
  cameraGroup: {
    height: "100%",
    width: "100%",
  },
  MapGroup: {
    display: "flex",
    justifyContent: "center",
  },
  ScienceGroup: {
    display: "flex",
    height: "100vh",
  },
  motorColumnLabel: {
    color: "black",
    fontSize: "16px",
    marginBottom: '5px'
  },
};

// --- VISUALIZER COMPONENT ---
const RobotVisualizer = ({ height = "300px", width = "100%" }) => {
  return (
    <div style={{
      height: height,
      width: width,
      background: "black",
      flexShrink: 0,
      border: "none",
      overflow: "auto"
    }}>
      <iframe
        src="http://localhost:7000"
        width="100%"
        height="100%"
        style={{ border: "none", pointerEvents: "auto" }}
        title="Robot Simulation"
      />
    </div>
  );
};

// --- DRAGGABLE WINDOW COMPONENT ---
const DraggableWindow = ({
  children,
  title = "Window",
  defaultPosition = { x: 100, y: 50 },
  defaultSize = { w: 600, h: 500 },
  fixed = true,
  collapsible = true,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      style={{
        position: fixed ? "fixed" : "absolute",
        left: position.x,
        top: position.y,
        width: defaultSize.w,
        height: collapsed ? 30 : defaultSize.h,
        backgroundColor: "var(--bg-panel)",
        color: "var(--text-primary)",
        border: "2px solid #333",
        boxShadow: "5px 5px 15px rgba(0,0,0,0.3)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        resize: collapsed ? "none" : "both",
        overflow: "auto",
        minWidth: "200px",
        minHeight: collapsed ? "30px" : "150px",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: "30px",
          backgroundColor: "var(--header-bg)",
          color: "var(--header-text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px 0 10px",
          cursor: "move",
          fontWeight: "bold",
          fontSize: "14px",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <span>{title}</span>

        {collapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            style={{
              cursor: "pointer",
              fontSize: "12px",
              padding: "2px 6px",
              backgroundColor: "#555",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, width: "100%", height: "100%" }}>
          {children}
        </div>
      )}
    </div>
  );
};

const drivebaseConfig = [
  { label: "front (L)", motorTopicPath: "/drivetrain/front_left" },
  { label: "front (R)", motorTopicPath: "/drivetrain/front_right" },
  { label: "drill", motorTopicPath: "/science/drill" },
  { label: "back (L)", motorTopicPath: "/drivetrain/back_left" },
  { label: "back (R)", motorTopicPath: "/drivetrain/back_right" },
];

const manipulatorConfig = [
  { label: "rail", motorTopicPath: "/manipulator/linear_rail" },
  { label: "shoulder", motorTopicPath: "/manipulator/shoulder" },
  { label: "elbow", motorTopicPath: "/manipulator/elbow" },
  { label: "pitch", motorTopicPath: "/manipulator/wrist_pitch" },
  { label: "roll", motorTopicPath: "/manipulator/wrist_roll" },
  { label: "claw", motorTopicPath: "/manipulator/claw" },
];



const App = () => {
  const { debugPoppedOut, setDebugPoppedOut } = useContext(DebugContext);
  const location = useLocation();

  return (
    <div style={styles.container}>
      {/* LEFT NAV */}
      <div style={styles.leftSidebar}>
        <NavBar />
      </div>

      {/* MAIN CONTENT (PERSISTENT) */}
      <div style={styles.content}>
        <div style={{ display: location.pathname === "/" ? "block" : "none", height: "100%" }}>
          <Home />
        </div>

        <div style={{ display: location.pathname === "/Map" ? "block" : "none", height: "100%" }}>
          <MapPage />
        </div>

        <div style={{ display: location.pathname === "/Science" ? "block" : "none", height: "100%" }}>
          <SciencePage />
        </div>

        <div style={{ display: location.pathname === "/Cameras" ? "block" : "none", height: "100%" }}>
          <Cameras />
        </div>

        <div style={{ display: location.pathname === "/Manipulator" ? "block" : "none", height: "100%" }}>
          <ManipulatorPage />
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={styles.rightSidebar}>
        <div style={styles.rightSidebar}>
            <ScreenshotTool />
            <CollapsibleWrapper title="Robot Visualizer" defaultCollapsed={true}>
            <RobotVisualizer />
          </CollapsibleWrapper>
          <CollapsibleWrapper title="Amps Display">
            <SidebarAmpsDisplay />
          </CollapsibleWrapper>

          

          <CollapsibleWrapper title="Sensors">
            <ForceSensor />
            <LimitSwitches />
            <RailPositionDisplay namespace="manipulator" />
          </CollapsibleWrapper>

          <CollapsibleWrapper title="Arm Controls">
            <ArmDebug />
          </CollapsibleWrapper>

          <CollapsibleWrapper title="Gimbal Control">
            <GimbalControl />
          </CollapsibleWrapper>

          <CollapsibleWrapper title="Belly Gimbal">
            <BellyGimbalControl />
          </CollapsibleWrapper>

            <PoseData />

        </div>
      </div>

      {/* DEBUG WINDOW */}
      {debugPoppedOut && (
        <DraggableWindow
          title="Debug Console"
          defaultPosition={{ x: 100, y: 100 }}
          defaultSize={{ w: 500, h: 500 }}
        >
          <div style={{ position: "relative", height: "100%" }}>
            <button
              onClick={() => setDebugPoppedOut(false)}
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                zIndex: 10,
                padding: "4px 8px",
                backgroundColor: "#aa0000",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Dock
            </button>

            <div style={{ marginTop: "30px", height: "calc(100% - 30px)" }}>
              <DebugPanel />
            </div>
          </div>
        </DraggableWindow>
      )}
    </div>
  );
};


export default function Root() {
  return (
    <DebugProvider>
      <ThemeProvider>
        <TelemetryProvider>
          <AmpProvider>
            <Router>
              <div style={{ height: "100%" }}>
                <App />
              </div>
            </Router>
          </AmpProvider>
        </TelemetryProvider>
      </ThemeProvider>
    </DebugProvider>
  );
}