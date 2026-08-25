import React, { createContext, useState } from "react";

export const TelemetryContext = createContext();

export const TelemetryProvider = ({ children }) => {

  const [telemetry, setTelemetry] = useState({

    // =========================
    // SYSTEM PANEL
    // =========================
    mapRosConnected: false,
    scienceConnected: false,
    cameraRosConnected: false,

    latitude: null,
    longitude: null,
    heading: null,
    speed: null,

    // =========================
    // AUTONOMY PANEL
    // =========================
    autonomy: false,
    goalStatus: false,
    waypointCount: 0,
    distanceToNext: null,
    eta: null,

    // =========================
    // SCIENCE PANEL
    // =========================
    drillActive: false,
    lastSoilMoisture: null,
    lastSpectrometerReading: null,

    // =========================
    // CAMERAS PANEL
    // =========================
    activeCameraCount: 0,
    streamingCameras: [],

    // =========================
    // GLOBAL
    // =========================
    lastUpdateTimestamp: null
  });

  const updateTelemetry = (key, value) => {
    setTelemetry(prev => ({
      ...prev,
      [key]: value,
      lastUpdateTimestamp: Date.now()
    }));
  };

  const updateTelemetryBatch = (updates) => {
    setTelemetry(prev => ({
      ...prev,
      ...updates,
      lastUpdateTimestamp: Date.now()
    }));
  };

  return (
    <TelemetryContext.Provider value={{ telemetry, updateTelemetry, updateTelemetryBatch }}>
      {children}
    </TelemetryContext.Provider>
  );
};