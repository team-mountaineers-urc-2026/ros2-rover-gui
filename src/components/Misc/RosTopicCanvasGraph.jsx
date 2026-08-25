import React, { useEffect, useState, useRef } from "react";
import ROSLIB from "roslib";

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const RosTopicCanvasGraph = ({ topicInfo, title, canvasHeight, canvasWidth}) => {
  const updateFrequencyHz = 2;
  const dataDepthSeconds = 60;
  const dataPoints = dataDepthSeconds * updateFrequencyHz;

  const [messageHistory, setMessageHistory] = useState(
    topicInfo.reduce((acc, { topic }) => ({ ...acc, [topic]: Array(dataPoints).fill(null) }), {})
  );
  const [timestamps, setTimestamps] = useState(Array(dataPoints).fill(null));
  const [hoveredTimeStep, setHoveredTimeStep] = useState(null);
  const [hoveredValues, setHoveredValues] = useState({});
  const [hoveredTopic, setHoveredTopic] = useState(null);
  const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);
  const [visibleGraphs, setVisibleGraphs] = useState(topicInfo.reduce((acc, { topic }) => ({ ...acc, [topic]: true }), {}));
  const [showAll, setShowAll] = useState(true);
  const canvasRef = useRef(null);
  const buffer = useRef({});
  const timeoutRefs = useRef({});

  useEffect(() => {

    const topicObjects = topicInfo.map(({ topic, label, color }) => {
      const rosTopic = new ROSLIB.Topic({
        ros,
        name: topic,
        messageType: "std_msgs/msg/Float32",
      });

      rosTopic.subscribe((message) => {
        buffer.current[topic] = message;

        if (timeoutRefs.current[topic]) clearTimeout(timeoutRefs.current[topic]);
        
        timeoutRefs.current[topic] = setTimeout(() => {
          buffer.current[topic] = null;
        }, 1000 / updateFrequencyHz);
      });

      return { rosTopic, label, color };
    });

    const intervalId = setInterval(() => {
      const timestamp = new Date();
      const formattedTime = `${timestamp.getHours().toString().padStart(2, "0")}:${timestamp
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${timestamp.getSeconds().toString().padStart(2, "0")}.${timestamp
        .getMilliseconds()
        .toString()
        .padStart(3, "0")}`;

      setMessageHistory((prevHistory) => {
        const newHistory = { ...prevHistory };
        topicInfo.forEach(({ topic }) => {
          newHistory[topic] = [
            ...(newHistory[topic] || []).slice(1),
            buffer.current[topic] ? buffer.current[topic].data.toFixed(2) : null,
          ];
        });
        return newHistory;
      });

      setTimestamps((prevTimestamps) => [
        ...prevTimestamps.slice(1),
        formattedTime,
      ]);
    }, 1000 / updateFrequencyHz);

    return () => {
      topicObjects.forEach(({ rosTopic }) => rosTopic.unsubscribe());
      clearInterval(intervalId);
      Object.values(timeoutRefs.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [topicInfo]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const visibleDataPoints = Object.entries(messageHistory)
      .filter(([topic]) => visibleGraphs[topic])
      .flatMap(([_, data]) => data);
    
    const maxData = Math.max(...visibleDataPoints.filter(d => d !== null));
    const minData = Math.min(...visibleDataPoints.filter(d => d !== null));

    topicInfo.forEach(({ topic, label, color }, idx) => {
      if (visibleGraphs[topic] && (hoveredTopic === null || hoveredTopic === topic)) {
        const history = messageHistory[topic];

        ctx.beginPath();
        let drawing = false;

        ctx.strokeStyle = (hoveredTopic === topic) ? "red" : color;

        history.forEach((point, index) => {
          const x = (index / (history.length - 1)) * canvasWidth;
          const y = point !== null ? canvasHeight - ((point - minData) / (maxData - minData) * canvasHeight) : null;

          if (y !== null) {
            if (!drawing) {
              ctx.moveTo(x, y);
              drawing = true;
            } else {
              ctx.lineTo(x, y);
            }
          } else {
            if (drawing) {
              ctx.stroke();
              drawing = false;
            }
          }
        });

        if (drawing) {
          ctx.stroke();
        }
      }
    });

    if (isMouseOnCanvas && hoveredTimeStep !== null) {
      const hoveredX = (hoveredTimeStep / (dataPoints - 1)) * canvasWidth;
      ctx.beginPath();
      ctx.moveTo(hoveredX, 0);
      ctx.lineTo(hoveredX, canvasHeight);
      ctx.strokeStyle = "black";
      ctx.stroke();
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    const mouseX = e.nativeEvent.offsetX;
    const timeStep = Math.floor(mouseX * dataPoints / canvasWidth);

    setHoveredTimeStep(timeStep);

    const values = {};
    const timestampsAtTime = timestamps[timeStep];
    topicInfo.forEach(({ topic }) => {
      const data = messageHistory[topic][timeStep];
      values[topic] = data !== null ? data : "no data";
    });

    setHoveredValues({ values, timestamp: timestampsAtTime });
  };

  const handleMouseEnter = () => { setIsMouseOnCanvas(true)};
  const handleMouseLeave = () => { setIsMouseOnCanvas(false); setHoveredTimeStep(null); };

  useEffect(() => {
    if (hoveredTimeStep !== null) {
      const values = {};
      const timestampsAtTime = timestamps[hoveredTimeStep];
      topicInfo.forEach(({ topic }) => {
        const data = messageHistory[topic][hoveredTimeStep];
        values[topic] = data !== null ? data : "no data";
      });
      setHoveredValues({ values, timestamp: timestampsAtTime });
    } else if (!isMouseOnCanvas) {
      const liveValues = {};
      topicInfo.forEach(({ topic }) => {
        const latestData = messageHistory[topic][messageHistory[topic].length - 1];
        liveValues[topic] = latestData !== null ? latestData : "no data";
      });
      setHoveredValues({ values: liveValues, timestamp: timestamps[timestamps.length - 1] });
    }
  }, [messageHistory, hoveredTimeStep, timestamps, isMouseOnCanvas]);

  useEffect(() => { drawCanvas(); }, [messageHistory, hoveredTimeStep, hoveredTopic, isMouseOnCanvas, visibleGraphs]);

  const handleCheckboxChange = (topic) => {setVisibleGraphs((prevState) => ({
      ...prevState,
      [topic]: !prevState[topic],
    }));};

  const handleShowAllToggle = () => {
    const newShowAllState = !showAll;
    setShowAll(newShowAllState);
    setVisibleGraphs(
      topicInfo.reduce((acc, { topic }) => ({ ...acc, [topic]: newShowAllState }), {})
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div style={{ flex: 1 }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        ></canvas>
      </div>
      <div style={{ marginLeft: "5px", marginRight: '5px', width: '200px', whiteSpace: 'nowrap', overflow: 'hidden'}}>
        <div style={{color: 'black', fontSize: '20px'}}>{title}</div>
        <div style={{color: 'black', }}>Time: {hoveredValues.timestamp ? hoveredValues.timestamp : "N/A"}</div>
        {hoveredValues?.values &&
          Object.entries(hoveredValues.values).map(([topic, value]) => (
            <div key={topic} style={{ color: topicInfo.find(({ topic: t }) => t === topic)?.color, marginBottom: "5px", display: "flex", alignItems: "center" }}>
              <input
                className="custom-checkbox"
                type="checkbox"
                checked={visibleGraphs[topic]}
                onChange={() => handleCheckboxChange(topic)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: visibleGraphs[topic] ? 'gray' : 'white', // Black if enabled, white if disabled
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />

              <div style={{ marginLeft: "5px" }}>
                {topicInfo.find(({ topic: t }) => t === topic)?.label || topic}: {value}
              </div>
            </div>
          ))}
        <button style={{border: 'none', backgroundColor:"gray", color: 'white',   }}onClick={handleShowAllToggle}>
          {showAll ? "Show None" : "Show All"}
        </button>
      </div>
    </div>
  );
};

export default RosTopicCanvasGraph;
