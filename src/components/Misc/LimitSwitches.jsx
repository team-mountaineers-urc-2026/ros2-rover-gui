import React, { useState, useEffect } from "react";
import ROSLIB from "roslib";

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const LimitSwitches = () => {
  const [switch1, setSwitch1] = useState(null);
  const [switch2, setSwitch2] = useState(null);

  useEffect(() => {
    const topic1 = new ROSLIB.Topic({
      ros,
      name: "/limit_switch_1",
      messageType: "std_msgs/msg/Bool",
    });

    const topic2 = new ROSLIB.Topic({
      ros,
      name: "/limit_switch_2",
      messageType: "std_msgs/msg/Bool",
    });

    topic1.subscribe((msg) => setSwitch1(msg.data));
    topic2.subscribe((msg) => setSwitch2(msg.data));

    return () => {
      topic1.unsubscribe();
      topic2.unsubscribe();
    };
  }, []);

  const Indicator = ({ label, value }) => (
    <div style={styles.row}>
      <span style={styles.switchLabel}>{label}</span>
      <span style={{
        ...styles.badge,
        backgroundColor: value === null ? "#555" : value ? "#27ae60" : "#c0392b",
      }}>
        {value === null ? "—" : value ? "OK" : "TRIGGERED"}
      </span>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>Limit Switches</div>
      <Indicator label="Left" value={switch1} />
      <Indicator label="Right" value={switch2} />
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-primary)",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    border: "1px solid #444",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  header: { fontWeight: "bold", opacity: 0.85, marginBottom: "2px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { opacity: 0.75 },
  badge: {
    padding: "2px 8px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "bold",
    color: "white",
    fontFamily: "monospace",
  },
};

export default LimitSwitches;