import React, { useContext, useRef, useEffect } from "react";
import { DebugContext } from "./DebugContext";
import { DebugRegistry } from "./DebugRegistry";

const DebugPanel = ({ minimal = false }) => {

    const LEVEL_COLORS = {
        error: "#FF5252",
        warn: "#FFB74D",
        info: "#4CAF50"
    };

    const {
        debugId,
        debugData,
        debugLog,
        clearLog
    } = useContext(DebugContext);

    const logRef = useRef(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [debugLog]);

    const Renderer =
        DebugRegistry[debugId] || DebugRegistry.default;

    const KEY_COLOR = "#4FC3F7";
    const VALUE_COLOR = "#A5D6A7";
    const COLON_COLOR = "#777";

    const renderObject = (obj, indent = 0) => {
        return Object.entries(obj).map(([key, value]) => (
            <div key={key} style={{ paddingLeft: indent }}>
                <span style={{ color: KEY_COLOR }}>
                    {key}
                </span>
                <span style={{ color: COLON_COLOR }}>:</span>{" "}
                {typeof value === "object" && value !== null ? (
                    <div>{renderObject(value, indent + 12)}</div>
                ) : (
                    <span style={{ color: VALUE_COLOR }}>
                        {String(value)}
                    </span>
                )}
            </div>
        ));
    };

    return (
        <div style={{
            fontFamily: "monospace",
            fontSize: "12px",
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>

            {/* --- Page Info Section (Hidden if minimal) --- */}
            {!minimal && (
                <>
                    <div style={{ flexShrink: 0 }}>
                        <Renderer {...debugData} />
                    </div>
                    <hr />
                </>
            )}

            {/* --- Global Log Section --- */}
            <div
                ref={logRef}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    background: "#111",
                    color: "#0f0",
                    padding: "6px"
                }}
            >
                {debugLog.map(entry => {
                    const levelColor = LEVEL_COLORS[entry.level] || "#4CAF50";

                    return (
                        <div
                            key={entry.id}
                            style={{
                                marginBottom: "6px",
                                borderLeft: `3px solid ${levelColor}`,
                                paddingLeft: "6px"
                            }}
                        >
                            <span style={{ color: "#888" }}>
                                [{entry.timestamp}]
                            </span>{" "}
                            <span style={{ color: levelColor, fontWeight: "bold" }}>
                                {entry.message}
                            </span>

                            {entry.data && (
                                <div style={{ marginTop: "2px" }}>
                                    {renderObject(entry.data)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
        onClick={clearLog}
        style={{
            flexShrink: 0,
            marginTop: "4px",
            fontSize: "11px"
        }}
    >
        Clear Log
    </button>
        </div>
    );
};

export default DebugPanel;