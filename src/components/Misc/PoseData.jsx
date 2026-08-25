import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const PoseData = ({ onDataUpdate }) => {
  const [heading, setHeading] = useState(0);
  const [position, setPosition] = useState({ latitude: 0, longitude: 0 });
  const [altitude, setAltitude] = useState(0);
  const [now, setNow] = useState(new Date());

  const headingOffset = 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const rotationListener = new ROSLIB.Topic({
      ros,
      name: '/health_monitor/chassis_orientation',
      messageType: 'geometry_msgs/msg/Vector3',
    });
    rotationListener.subscribe((message) => {
      const deg = (-message.z * (180 / Math.PI) + 360) % 360 + headingOffset;
      setHeading(deg);
      onDataUpdate?.({ heading: deg });
    });
    return () => rotationListener.unsubscribe();
  }, []);

  useEffect(() => {
    const positionListener = new ROSLIB.Topic({
      ros,
      name: '/mavros/global_position/global',
      messageType: 'sensor_msgs/msg/NavSatFix',
    });
    positionListener.subscribe((message) => {
      setPosition({ latitude: message.latitude, longitude: message.longitude });
      setAltitude(message.altitude);
      onDataUpdate?.({ lat: message.latitude, lon: message.longitude, alt: message.altitude });
    });
    return () => positionListener.unsubscribe();
  }, []);

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <div style={styles.title}>Pose Data</div>
        <div style={styles.datetime}>
          {now.toLocaleDateString()} &nbsp; {now.toLocaleTimeString()}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.label}>Heading:</div>
        <div style={styles.value}>{heading.toFixed(1)}°</div>

        <div style={styles.label}>Altitude:</div>
        <div style={styles.value}>{altitude.toFixed(2)} m</div>

        <div style={styles.label}>Position:</div>
        <div></div>

        <div style={styles.subLabel}>LAT:</div>
        <div style={styles.value}>{position.latitude.toFixed(6)}</div>

        <div style={styles.subLabel}>LONG:</div>
        <div style={styles.value}>{position.longitude.toFixed(6)}</div>
      </div>

    </div>
  );
};

const styles = {
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "0px",
    color: "var(--text-primary)"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  title: {
    fontSize: "18px",
    fontWeight: 600
  },

  datetime: {
    fontSize: "13px",
    fontWeight: 400
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "75px 1fr",
    rowGap: "6px",
    columnGap: "12px",
    fontSize: "16px"
  },

  label: {
    fontWeight: 500
  },

  subLabel: {
    paddingLeft: "14px",
    fontWeight: 400
  },

  value: {
    fontFamily: "monospace",
    fontWeight: 400,
    textAlign: "left"
  }
};

export default PoseData;
