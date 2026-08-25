import React, { useContext } from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import { DebugFlowRegistry } from "./DebugFlowRegistry";
import { DebugContext } from "./DebugContext";

const typeColors = {
  input: "#9e9e9e",
  function: "#ffeb3b",
  publisher: "#2196f3",
  subscriber: "#4caf50",
  state: "#ff9800",
  ui: "#9c27b0"
};

const FlowViewer = ({ pageId }) => {

  const { activeFlowNodes } = useContext(DebugContext);
  const flow = DebugFlowRegistry[pageId];
  const [selectedNode, setSelectedNode] = React.useState(null);

  const initialNodes = React.useMemo(() => {
    return flow.nodes.map((node) => ({
      id: node.id,
      type: "default",
      data: { label: node.label },
      position: { x: node.x, y: node.y }
    }));
  }, [pageId]); // only changes if page changes

  const initialEdges = React.useMemo(() => {
    return flow.edges.map((edge, index) => ({
      id: "e" + index,
      source: edge.from,
      target: edge.to,
      animated: true
    }));
  }, [pageId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const original = flow.nodes.find(n => n.id === node.id);
        const isActive = activeFlowNodes.has(node.id);

        return {
          ...node,
          style: {
            background: isActive
              ? "#1aa6d1"
              : typeColors[original.type] || "#ddd",
            border: selectedNode?.id === node.id
              ? "3px solid black"
              : "2px solid #333",
            borderRadius: "6px",
            padding: "10px",
            fontWeight: "bold",
            boxShadow: isActive
              ? "0 0 25px rgba(7, 143, 255, 0.82)"
              : "none",
          }
        };
      })
    );
  }, [activeFlowNodes, selectedNode]);


  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>

      <div style={{ flex: 1, position: "relative" }}>

        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "#ffffff",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          zIndex: 10,
          fontSize: "12px"
        }}>
          <strong>Legend</strong>
          <div style={{ marginTop: "6px" }}>
            {Object.entries(typeColors).map(([key, color]) => (
              <div key={key} style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px"
              }}>
                <div style={{
                  width: "14px",
                  height: "14px",
                  background: color,
                  marginRight: "6px",
                  border: "1px solid #333"
                }} />
                <span>{key}</span>
              </div>
            ))}
          </div>
        </div>


        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(event, node) => {
            const fullNode = flow.nodes.find(n => n.id === node.id);
            setSelectedNode(fullNode);
          }}
        >
          <Controls />
          <Background />
        </ReactFlow>

      </div>

      {selectedNode && (
  <div style={{
    width: "350px",
    borderLeft: "2px solid #ccc",
    padding: "15px",
    overflowY: "auto",
    background: "#f8f8f8"
  }}>
    <h3>{selectedNode.label}</h3>
    <p><strong>Type:</strong> {selectedNode.type}</p>

    {/* MUTATES */}
    {selectedNode.mutates?.length > 0 && (
      <div style={{ marginTop: "15px" }}>
        <h4>Mutates</h4>
        {selectedNode.mutates.map(state => (
          <div key={state} style={{
            background: "rgba(255, 80, 80, 0.15)",
            padding: "6px",
            marginBottom: "6px",
            borderRadius: "4px"
          }}>
            {state}
          </div>
        ))}
      </div>
    )}

    {/* READS */}
    {selectedNode.reads?.length > 0 && (
      <div style={{ marginTop: "15px" }}>
        <h4>Reads</h4>
        {selectedNode.reads.map(state => (
          <div key={state} style={{
            background: "rgba(80, 150, 255, 0.15)",
            padding: "6px",
            marginBottom: "6px",
            borderRadius: "4px"
          }}>
            {state}
          </div>
        ))}
      </div>
    )}

    {/* PUBLISHES */}
    {selectedNode.publishes?.length > 0 && (
      <div style={{ marginTop: "15px" }}>
        <h4>Publishes</h4>
        {selectedNode.publishes.map(topic => (
          <div key={topic} style={{
            background: "rgba(80, 255, 150, 0.15)",
            padding: "6px",
            marginBottom: "6px",
            borderRadius: "4px"
          }}>
            {topic}
          </div>
        ))}
      </div>
    )}

    {/* INFO (keep existing support) */}
    {/* MESSAGE TYPE */}
{selectedNode.messageType && (
  <div style={{ marginTop: "15px" }}>
    <h4>Message Type</h4>
    <div>{selectedNode.messageType}</div>
  </div>
)}

{/* MESSAGE STRUCTURE */}
{selectedNode.messageStructure && (
  <div style={{ marginTop: "15px" }}>
    <h4>Message Structure</h4>
    <pre style={{
      background: "#fff",
      padding: "8px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "12px"
    }}>
      {JSON.stringify(selectedNode.messageStructure, null, 2)}
    </pre>
  </div>
)}

{/* PUBLISH MESSAGE STRUCTURE */}
{selectedNode.publishMessageStructure && (
  <div style={{ marginTop: "15px" }}>
    <h4>Published Message</h4>
    <div><strong>Type:</strong> {selectedNode.publishMessageType}</div>
    <pre style={{
      background: "#fff",
      padding: "8px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "12px"
    }}>
      {JSON.stringify(selectedNode.publishMessageStructure, null, 2)}
    </pre>
  </div>
)}

  </div>
)}

    </div>
  );
};

export default FlowViewer;