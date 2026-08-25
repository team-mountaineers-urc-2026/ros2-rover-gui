import React from "react";

export const DebugContext = React.createContext(null);

export const DebugProvider = ({ children }) => {
  
  const [debugId, setDebugId] = React.useState(null);
  const [debugData, setDebugData] = React.useState({});
  const [debugLog, setDebugLog] = React.useState([]);
  const [debugPoppedOut, setDebugPoppedOut] = React.useState(false);

  

const [activeFlowNodes, setActiveFlowNodes] = React.useState(new Set());

  const triggerFlowNode = (nodeId) => {
  setActiveFlowNodes(prev => {
    const next = new Set(prev);
    next.add(nodeId);
    return next;
  });

  setTimeout(() => {
    setActiveFlowNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, 600);
};

  const logEvent = (message, data = null, level = "info") => {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      data,
      level
    };

    setDebugLog(prev => [...prev, entry]);
  };

  const clearLog = () => setDebugLog([]);

  return (
    <DebugContext.Provider
      value={{
        debugPoppedOut,
        setDebugPoppedOut,
        debugId,
        setDebugId,     // <-- MUST EXIST
        debugData,
        setDebugData,   // <-- MUST EXIST
        debugLog,
        logEvent,
        clearLog,
        triggerFlowNode,
        activeFlowNodes,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
};