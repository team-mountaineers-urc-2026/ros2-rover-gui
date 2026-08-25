import React from "react";
import { DebugTopicsRegistry } from "./DebugTopicsRegistry";
import FlowViewer from "./FlowViewer";

/* ===========================
   TOPICS VIEWER
=========================== */
const TopicsViewer = ({ pageId }) => {
    const topics = DebugTopicsRegistry[pageId] || [];
    const [selected, setSelected] = React.useState(null);



    return (
        <div style={{ display: "flex", height: "100%" }}>

            {/* Left Topic List */}
            <div style={{
                width: "40%",
                borderRight: "1px solid #ccc",
                overflowY: "auto",
                paddingRight: "10px"
            }}>
                <h3>Topics</h3>

                {topics.map((topic, index) => (
                    <div
                        key={index}
                        onClick={() => setSelected(topic)}
                        style={{
                            padding: "8px",
                            cursor: "pointer",
                            background: selected === topic ? "#eee" : "transparent",
                            borderRadius: "4px"
                        }}
                    >
                        {topic.name}
                    </div>
                ))}
            </div>

            {/* Right Detail Panel */}
            <div style={{
                flex: 1,
                padding: "15px",
                overflowY: "auto"
            }}>
                {selected ? (
                    <>
                        <h2>{selected.name}</h2>

                        <p><strong>Direction:</strong> {selected.direction}</p>
                        <p><strong>Message Type:</strong> {selected.messageType}</p>
                        <p><strong>Description:</strong> {selected.description}</p>

                        {selected.format && (
                            <>
                                <h4>Message Format</h4>
                                <pre>
                                    {JSON.stringify(selected.format, null, 2)}
                                </pre>
                            </>
                        )}
                    </>
                ) : (
                    <p>Select a topic to view details.</p>
                )}
            </div>
        </div>
    );
};


/* ===========================
   MAP DEBUG RENDERER
=========================== */
const MapDebugRenderer = (props) => {
    const [panelPosition, setPanelPosition] = React.useState({ x: 200, y: 100 });
    const [panelSize, setPanelSize] = React.useState({ width: 900, height: 600 });
    const dragging = React.useRef(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });

    const onMouseDown = (e) => {
        dragging.current = true;
        dragOffset.current = {
            x: e.clientX - panelPosition.x,
            y: e.clientY - panelPosition.y
        };
    };

    const onMouseMove = (e) => {
        if (!dragging.current) return;
        setPanelPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    };

    const onMouseUp = () => {
        dragging.current = false;
    };


    React.useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);
    const [mode, setMode] = React.useState("info");
    // modes: "info" | "guide" | "topics"

    return (
        <div style={{ position: "relative", height: "100%" }}>

            {/* ================= INFO VIEW ================= */}
            {mode === "info" && (
                <>
                    <h3>Map Debug</h3>
                    <div>Waypoints: {props.markerCount}</div>
                    <div>Selected: {props.selectedMarker}</div>
                    <div>Latitude: {props.latitude}</div>
                    <div>Longitude: {props.longitude}</div>

                    <div style={{ marginTop: "8px" }}>
                        <button onClick={() => setMode("guide")}>
                            Debug Guide
                        </button>

                        <button
                            onClick={() => setMode("topics")}
                            style={{ marginLeft: "8px" }}
                        >
                            Topics
                        </button>
                        <button
                            onClick={() => setMode("flow")}
                            style={{ marginLeft: "8px" }}
                        >
                            Flow
                        </button>
                    </div>
                </>
            )}

            {/* ================= MODAL OVERLAY ================= */}
            {/* ================= GUIDE ================= */}
            {mode === "guide" && (
                <div style={{
                    position: "fixed",
                    top: "10vh",
                    left: "12.5vw",
                    width: "75vw",
                    height: "75vh",
                    background: "#ffffff",
                    border: "2px solid #888",
                    borderRadius: "8px",
                    padding: "25px",
                    overflowY: "auto",
                    zIndex: 99999,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                }}>
                    <button
                        onClick={() => setMode("info")}
                        style={{
                            position: "absolute",
                            top: "15px",
                            right: "15px",
                            background: "#f44336",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>

                    <h2>Map Debug Guide</h2>
                    {/* Guide content */}
                </div>
            )}

            {/* ================= TOPICS ================= */}
            {mode === "topics" && (
                <div style={{
                    position: "fixed",
                    top: "10vh",
                    left: "12.5vw",
                    width: "75vw",
                    height: "75vh",
                    background: "#ffffff",
                    border: "2px solid #888",
                    borderRadius: "8px",
                    padding: "25px",
                    overflow: "hidden",
                    zIndex: 99999,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                }}>
                    <button
                        onClick={() => setMode("info")}
                        style={{
                            position: "absolute",
                            top: "15px",
                            right: "15px",
                            background: "#f44336",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>

                    <TopicsViewer pageId="map" />
                </div>
            )}

            {/* ================= FLOW (FLOATING, NO MODAL) ================= */}
            {mode === "flow" && (
                <div
                    style={{
                        position: "fixed",
                        top: panelPosition.y,
                        left: panelPosition.x,
                        width: panelSize.width,
                        height: panelSize.height,
                        background: "#ffffff",
                        border: "2px solid #888",
                        borderRadius: "8px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        zIndex: 99999,
                        display: "flex",
                        flexDirection: "column",
                        resize: "both",
                        overflow: "hidden"
                    }}
                >
                    <div
                        onMouseDown={onMouseDown}
                        style={{
                            cursor: "move",
                            padding: "8px",
                            background: "#f0f0f0",
                            borderBottom: "1px solid #ccc",
                            userSelect: "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <span>Map Flow Viewer</span>

                        <button
                            onClick={() => setMode("info")}
                            style={{
                                background: "#f44336",
                                color: "#fff",
                                border: "none",
                                padding: "4px 8px",
                                cursor: "pointer"
                            }}
                        >
                            Close
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: "hidden" }}>
                        <FlowViewer pageId="map" />
                    </div>
                </div>
            )}
        </div>
    );
};


const ScienceDebugRenderer = (props) => {
    const [mode, setMode] = React.useState("info");

    const [panelPosition, setPanelPosition] = React.useState({ x: 250, y: 120 });
    const [panelSize, setPanelSize] = React.useState({ width: 900, height: 600 });

    const dragging = React.useRef(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });

    const onMouseDown = (e) => {
        dragging.current = true;
        dragOffset.current = {
            x: e.clientX - panelPosition.x,
            y: e.clientY - panelPosition.y
        };
    };

    const onMouseMove = (e) => {
        if (!dragging.current) return;
        setPanelPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    };

    const onMouseUp = () => {
        dragging.current = false;
    };

    React.useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    return (
        <div style={{ position: "relative", height: "100%" }}>

            {/* ================= INFO VIEW ================= */}
            {mode === "info" && (
                <>
                    <h3>Science Debug</h3>

                    <div style={{ marginTop: "8px" }}>
                        <button onClick={() => setMode("topics")}>
                            Topics
                        </button>

                        <button
                            onClick={() => setMode("flow")}
                            style={{ marginLeft: "8px" }}
                        >
                            Flow
                        </button>
                    </div>
                </>
            )}

            {/* ================= TOPICS MODAL ================= */}
            {mode === "topics" && (
                <div style={{
                    position: "fixed",
                    top: "10vh",
                    left: "12.5vw",
                    width: "75vw",
                    height: "75vh",
                    background: "#ffffff",
                    border: "2px solid #888",
                    borderRadius: "8px",
                    padding: "25px",
                    overflow: "hidden",
                    zIndex: 99999,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                }}>
                    <button
                        onClick={() => setMode("info")}
                        style={{
                            position: "absolute",
                            top: "15px",
                            right: "15px",
                            background: "#f44336",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>

                    <TopicsViewer pageId="science" />
                </div>
            )}

            {/* ================= FLOW FLOATING PANEL ================= */}
            {mode === "flow" && (
                <div
                    style={{
                        position: "fixed",
                        top: panelPosition.y,
                        left: panelPosition.x,
                        width: panelSize.width,
                        height: panelSize.height,
                        background: "#ffffff",
                        border: "2px solid #888",
                        borderRadius: "8px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        zIndex: 99999,
                        display: "flex",
                        flexDirection: "column",
                        resize: "both",
                        overflow: "hidden"
                    }}
                >
                    <div
                        onMouseDown={onMouseDown}
                        style={{
                            cursor: "move",
                            padding: "8px",
                            background: "#f0f0f0",
                            borderBottom: "1px solid #ccc",
                            userSelect: "none",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <span>Science Flow Viewer</span>

                        <button
                            onClick={() => setMode("info")}
                            style={{
                                background: "#f44336",
                                color: "#fff",
                                border: "none",
                                padding: "4px 8px",
                                cursor: "pointer"
                            }}
                        >
                            Close
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: "hidden" }}>
                        <FlowViewer pageId="science" />
                    </div>
                </div>
            )}
        </div>
    );
};



/* ===========================
   DEBUG REGISTRY EXPORT
=========================== */
export const DebugRegistry = {
    map: MapDebugRenderer,

    science: ScienceDebugRenderer,

    cameras: (data) => (
        <>
            <h3>Cameras Debug</h3>
            <div>Active Streams: {data.streamCount}</div>
        </>
    ),

    default: (data) => (
        <>
            <h3>Debug</h3>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
    )
};