import { useContext } from "react";
import { DebugContext } from "./Misc/DebugContext";
import { ThemeContext } from "./Themes/ThemeContext";
import { ReactComponent as Logo } from "./Misc/logo.svg";
import { TelemetryContext } from "./Misc/TelemetryContext";
import DebugPanel from "./Misc/DebugPanel";


const styles = {

    wrapper: {
        height: "100vh",
        padding: "30px",
        boxSizing: "border-box",
        display: "flex",
        overflow: "hidden"
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "auto 1fr",
        gap: "25px",
        height: "100%",
        width: "100%",
        minHeight: 0,
    },

    panel: {
        backgroundColor: "var(--bg-panel)",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #333",
        boxShadow: "2px 2px 12px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0                  // IMPORTANT: allows flex children to shrink
    },

    fillPanel: {
        overflowY: "hidden",
        maxheight: "100%",
        minHeight: 0
    },

    logContainer: {
        flex: 1,
        minHeight: 0
    },

    logoContainer: {
        gridColumn: "2 / span 2",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        minHeight: 0
    },

    logo: {
        width: "80%",
        opacity: 0.9
    }
};


const Panel = ({ title, children, fill }) => {
    return (
        <div
            style={{
                ...styles.panel,
                ...(fill ? styles.fillPanel : {}),
                minHeight: 0
            }}
        >
            <h2 style={{ marginBottom: "15px", flexShrink: 0 }}>
                {title}
            </h2>

            <div style={{ flex: 1, minHeight: 0 }}>
                {children}
            </div>
        </div>
    );
};

const Metric = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span>{label}</span>
        <strong>{value ?? "N/A"}</strong>
    </div>
);

const Indicator = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span>{label}</span>
        <span style={{
            backgroundColor: value ? "#00aa00" : "#aa0000",
            padding: "4px 10px",
            borderRadius: "4px",
            color: "white",
            fontWeight: "bold",


        }}>
            {value ? "" : ""}
        </span>
    </div>
);



const Home = () => {
    const { theme, setTheme } = useContext(ThemeContext);
    const { telemetry } = useContext(TelemetryContext);
    const { debugPoppedOut, setDebugPoppedOut } = useContext(DebugContext);

    return (
        <div style={styles.wrapper}>


            <div style={styles.grid}>

                {/* === TOP ROW === */}
                <Panel title="System">
                    <Indicator label="Map Connected" value={telemetry.mapConnected} />
                    <Indicator label="Science Connected" value={telemetry.scienceConnected} />
                    <Indicator label="Cameras Connected" value={telemetry.cameraRosConnected} />
                    <Metric label="Latitude" value={telemetry.latitude ?? "N/A"} />
                    <Metric label="Longitude" value={telemetry.longitude ?? "N/A"} />
                    <Metric label="Heading" value={telemetry.heading ?? "N/A"} />
                    <Metric label="Speed (m/s)" value={telemetry.speed ?? "N/A"} />
                </Panel>

                <Panel title="Autonomy">
                    <Indicator label="Autonomous Mode" value={telemetry.autonomy} />
                    <Indicator label="Goal Reached" value={telemetry.goalStatus} />
                    <Metric label="Waypoints" value={telemetry.waypointCount} />
                    <Metric label="Distance to Next" value={telemetry.distanceToNext ?? "N/A"} />
                    <Metric label="ETA" value={telemetry.eta ?? "N/A"} />
                </Panel>

                <Panel title="Science">
                    <Indicator label="Connected" value={telemetry.scienceConnected} />
                    <Indicator label="Drill Active" value={telemetry.drillActive} />
                    <Metric label="Soil Moisture" value={telemetry.lastSoilMoisture ?? "N/A"} />
                    <Metric label="Spectrometer" value={telemetry.lastSpectrometerReading ?? "N/A"} />
                </Panel>

                <Panel title="Cameras">
                    <Indicator label="ROS" value={telemetry.cameraRosConnected} />
                    <Metric label="Active Streams" value={telemetry.activeCameraCount} />
                    <Metric label="Streaming IDs" value={telemetry.streamingCameras?.join(", ") ?? "—"} />
                </Panel>

                {/* === BOTTOM ROW === */}

                <Panel
                    title={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Event Log</span>
                            <button
                                onClick={() => setDebugPoppedOut(true)}
                                style={{
                                    background: "none",
                                    border: "1px solid #555",
                                    color: "white",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Pop Out
                            </button>
                        </div>
                    }
                    fill
                >

                    <DebugPanel minimal />

                </Panel>

                {/* Logo spans col 2 + 3 */}
                <div style={styles.logoContainer}>
                    <Logo style={styles.logo} />
                </div>

                <Panel title="Settings" fill>
                    <label>
                        <input
                            type="checkbox"
                            checked={theme === "dark"}
                            onChange={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                        />
                        Dark Mode
                    </label>
                </Panel>

            </div>

        </div>
    )
};

export default Home;