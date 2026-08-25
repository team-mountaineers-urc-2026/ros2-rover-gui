import React, { useState, useEffect } from "react";
import ROSLIB from "roslib";

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const ForceSensor = () => {
  const [force, setForce] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros,
      name: "/science/manipulator_force",
      messageType: "std_msgs/msg/Float32",
    });

    topic.subscribe((msg) => setForce(msg.data));
    return () => topic.unsubscribe();
  }, []);

  return (
    <div style={styles.container}>
      <span style={styles.label}>Force Sensor</span>
      <span style={styles.value}>
        {force !== null ? `${force.toFixed(2)}` : "—"}
      </span>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-primary)",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    border: "1px solid #444",
  },
  label: { fontWeight: "bold", opacity: 0.85 },
  value: { fontFamily: "monospace", fontSize: "14px", color: "var(--accent, #4fc3f7)" },
};

export default ForceSensor;