/**
 * Component for a singular camera that is to be displayed by Cameras.jsx
 */
import ROSLIB from 'roslib';
import React, { useEffect } from 'react';

const hardware_restart = 4;
const attribute_modify = 5;
const attr_stream_resolution = 7;
const attr_stream_fps = 9;
const OBJECT_LABELS={
  3: 'bottle',
  7: 'hammer',
};
// How long bounding boxes should stay visible after being received
const DETECTION_PERSIST_MS = 10000;

function getUrl(cid) {
  if (cid === -1) {
    return "http://192.168.1.69:8889/wrist";
  } else if (cid === -2) {
    return "http://192.168.1.69:8889/fisheye";
  } else if (cid >= 0) {
    return "http://192.168.1.69:8889/logi" + cid;
  } else {
    console.error(`Invalid cid ${cid} of type ${typeof cid}`);
    return '';
  }
}

function make_res_obj(resStr, qualId) {
  const obj = {};
  obj.res = resStr;
  obj.quality_id = qualId;
  return obj;
}

const resolutions = [
  make_res_obj('160x90', 0),
  make_res_obj('320x180', 1),
  make_res_obj('640x360', 4),
  make_res_obj('1280x720', 6),
  make_res_obj('1920x1080', 10),
];

function flip(cid) {
  const camera = document.getElementById('camera' + cid + '_frame');

  if (camera) {
    if (camera.style.transform === '') {
      camera.style.transform = 'rotate(180deg)';
      console.log('flipped ', cid);
    } else {
      camera.style.transform = '';
      console.log('unflipped ', cid);
    }
  }
}

const SingleCam = ({
  camera_id,
  streamUpdateFunc,
  canvas,
  cm_ros_interface,
  forceValue           
}) => {
  const containerRef = React.useRef(null);
  const iframeRef = React.useRef(null);

  // Turn boxes on by default while testing
  const [showBoxes, setShowBoxes] = React.useState(true);
  const [detections, setDetections] = React.useState([]);

  const [desired_fps, setDesiredFps] = React.useState('15');
  const [currentResolution, setCurrentResolution] = React.useState(1);

  // --- NEW 2-AXIS GIMBAL LOGIC START ---
  const [yaw, setYaw] = React.useState(0.0);
  const [pitch, setPitch] = React.useState(0.0);

  const GIMBAL_ID = 22;

  const YAW_LIMIT = 135.0;
  const PITCH_MIN = -30.0;
  const PITCH_MAX = 90.0;
  const STEP = 10.0;
  // --- NEW 2-AXIS GIMBAL LOGIC END ---

  if (!cm_ros_interface) {
    console.error(
      `cm_ros_interface is not defined in SingleCam ${camera_id} component - settings will not be available`
    );
  }

  /*
  // 40 is a logitech now
  if (camera_id === 40) {
    camera_id = -1;
    console.log('Changing camera_id to -1 for Realsense special case');
  }
  */

  if (camera_id === 80) {
    camera_id = -2;
    console.log('Changing camera_id to -2 for fisheye special case');
  }

  /*
   * IMPORTANT:
   * These are the image coordinate dimensions that the bbox values are expected to use.
   *
   * If your payload later includes im_width and im_height, use that instead.
   * For now, this matches your default display dimensions:
   * regular cams: 320x180
   * fisheye: 300x300
   */
  const IMAGE_WIDTH = camera_id === -2 ? 300 : 320;
  const IMAGE_HEIGHT = camera_id === -2 ? 300 : 180;

  /*
   * Bounding box subscription.
   *
   * This version:
   * - parses std_msgs/String JSON from /autonomy/bounding_boxes
   * - normalizes bbox_xyxy data
   * - stores each detection with expiresAt
   * - keeps previous detections alive for 5 seconds
   */
  useEffect(() => {
    if (!cm_ros_interface?.ros) return;

    const boundingBoxTopic = new ROSLIB.Topic({
      ros: cm_ros_interface.ros,
      name: '/autonomy/bounding_boxes',
      messageType: 'std_msgs/String',
      queue_size: 1,
    });

    let raf = null;
    let latestDetections = [];

    const normalizeDetections = (payload) => {
      const rawDetections = Array.isArray(payload?.detections)
        ? payload.detections
        : [];

      const now = Date.now();

      return rawDetections
        .map((det, idx) => {
          /*
           * Accept a few possible bbox field names so the GUI
           * does not silently fail if the backend uses a slightly
           * different key.
           */
          const b = det?.boundingbox_xyxy || det?.bbox || det?.box;

          if (!b) return null;

          const x1 = Number(b.x1);
          const y1 = Number(b.y1);
          const x2 = Number(b.x2);
          const y2 = Number(b.y2);

          if (![x1, y1, x2, y2].every(Number.isFinite)) {
            return null;
          }
          const classId=Number(det?.class_id);
          return {
            id: `${payload?.frame_id ?? 'frame'}-${idx}-${now}`,
            class_id: classId,
            label: OBJECT_LABELS[classId] || det?.label || det?.class_name || 'object ${det?.class_id ?? "unknown"}',
            confidence: det?.confidence,
            bbox_xyxy: { x1, y1, x2, y2 },
            expiresAt: now + DETECTION_PERSIST_MS,
          };
        })
        .filter(Boolean);
    };

    const onMsg = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        const normalized = normalizeDetections(payload);

        if (normalized.length === 0) {
          return;
        }

        latestDetections = normalized;

        if (raf === null) {
          raf = requestAnimationFrame(() => {
            raf = null;

            setDetections((prev) => {
              const now = Date.now();

              // Keep old detections that have not expired yet
              const stillAlive = prev.filter((d) => d.expiresAt > now);

              // Add the newest detections
              return [...stillAlive, ...latestDetections];
            });
          });
        }
      } catch (e) {
        console.error('Failed to parse bounding box message:', e, msg);
      }
    };

    boundingBoxTopic.subscribe(onMsg);

    return () => {
      boundingBoxTopic.unsubscribe(onMsg);

      if (raf !== null) {
        cancelAnimationFrame(raf);
      }
    };
  }, [cm_ros_interface?.ros, camera_id]);

  /*
   * Cleanup timer.
   *
   * This removes boxes once their 5 seconds are up, even if no new
   * messages arrive afterward.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setDetections((prev) => prev.filter((d) => d.expiresAt > now));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const moveGimbal = (axis, direction) => {
    let newYaw = yaw;
    let newPitch = pitch;

    if (axis === 'yaw') {
      if (direction === 'left') newYaw -= STEP;
      if (direction === 'right') newYaw += STEP;
      if (direction === 'center') newYaw = 0.0;

      if (newYaw > YAW_LIMIT) newYaw = YAW_LIMIT;
      if (newYaw < -YAW_LIMIT) newYaw = -YAW_LIMIT;

      setYaw(newYaw);
    } else if (axis === 'pitch') {
      if (direction === 'up') newPitch -= STEP;
      if (direction === 'down') newPitch += STEP;
      if (direction === 'center') newPitch = 0.0;

      if (newPitch > PITCH_MAX) newPitch = PITCH_MAX;
      if (newPitch < PITCH_MIN) newPitch = PITCH_MIN;

      setPitch(newPitch);
    }

    const gimbalTopic = new ROSLIB.Topic({
      ros: cm_ros_interface.ros,
      name: '/gimbal_move_pos',
      messageType: 'sensor_msgs/JointState',
    });

    const jointMsg = new ROSLIB.Message({
      header: {
        seq: 0,
        stamp: { sec: 0, nsec: 0 },
        frame_id: '',
      },
      name: ['yaw', 'pitch'],
      position: [newYaw, newPitch],
      velocity: [],
      effort: [],
    });

    gimbalTopic.publish(jointMsg);
    console.log(`Gimbal Move: Yaw=${newYaw}, Pitch=${newPitch}`);
  };

  /*
   * Default camera position and default iframe size.
   *
   * The SVG overlay is inside the same relative wrapper and uses
   * width/height 100%, so it follows the iframe when the camera
   * window is moved or resized.
   */
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.left = '0px';
      containerRef.current.style.top = '0px';
    }

    if (iframeRef.current) {
      iframeRef.current.style.width = camera_id === -2 ? '300px' : '320px';
      iframeRef.current.style.height = camera_id === -2 ? '300px' : '180px';
    }
  }, [camera_id]);

  const change_fps = (fps) => {
    if (fps > 30) fps = 30;
    if (fps <= 0) fps = 1;

    cm_ros_interface.publish(
      new ROSLIB.Message({
        command_type: attribute_modify,
        camera_id: camera_id,
        quality: 0,
        attribute: attr_stream_fps,
        attr_value: fps,
      })
    );

    console.log(`Set FPS for camera ${camera_id} to ${fps}`);
  };

  const change_res = (resolution_id) => {
    if (resolution_id < 0 || resolution_id > 10) return;

    if (resolution_id >= 6) {
      const selected = resolutions.find(
        (res) => res.quality_id === resolution_id
      );

      const confirmMessage = `Setting a high resolution may cause performance issues. Are you sure you want to set the resolution to ${selected?.res}?`;

      if (!window.confirm(confirmMessage)) return;
    }

    cm_ros_interface.publish(
      new ROSLIB.Message({
        command_type: attribute_modify,
        camera_id: camera_id,
        quality: 0,
        attribute: attr_stream_resolution,
        attr_value: resolution_id,
      })
    );

    console.log(`Set resolution for camera ${camera_id} to ${resolution_id}`);
  };

  const hardwareRestart = () => {
    cm_ros_interface.publish(
      new ROSLIB.Message({
        command_type: hardware_restart,
        camera_id: camera_id,
        quality: 0,
        attribute: 0,
        attr_value: 0,
      })
    );

    console.log(`Sent hardware restart command for camera ${camera_id}`);
  };

  const title = 'cam_' + camera_id;

  return (
    <div
      id={'camera' + camera_id}
      style={styles.container}
      ref={containerRef}
    >
      <div style={styles.ID_display}>{camera_id}</div>

      <div style={styles.cameraViewport}>
        <iframe
          ref={iframeRef}
          style={styles.cameraFrame}
          title={title}
          src={getUrl(camera_id)}
          id={'camera' + camera_id + '_frame'}
        ></iframe>

        {showBoxes && (
          <svg
            style={styles.bboxOverlay}
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            preserveAspectRatio="none"
          >
            {detections.map((det) => {
              const b = det?.bbox_xyxy;

              if (!b) return null;

              const x1 = Number(b.x1);
              const y1 = Number(b.y1);
              const x2 = Number(b.x2);
              const y2 = Number(b.y2);

              if (![x1, y1, x2, y2].every(Number.isFinite)) {
                return null;
              }

              const x = Math.min(x1, x2);
              const y = Math.min(y1, y2);
              const w = Math.abs(x2 - x1);
              const h = Math.abs(y2 - y1);

              if (w <= 0 || h <= 0) {
                return null;
              }

              return (
                <g key={det.id}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="rgba(0, 255, 0, 0.15)"
                    stroke="red"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />

                  <text
                    x={x}
                    y={Math.max(y - 6, 14)}
                    fill="lime"
                    fontSize="14"
                    fontWeight="bold"
                    stroke="black"
                    strokeWidth="0.5"
                  >
                    {det.label}
                    {det.confidence !== undefined
                      ? ` ${Number(det.confidence) >1 
                          ? Math.round(Number(det.confidence))
                          : Math.round(Number(det.confidence)*100)}%`
                      : ''}
                  </text>
                </g>
              );
            })}
            {/* Force sensor overlay — wrist cam (ID 12) only */}
          {forceValue !== null && (
            <g>
              <rect
                x={parseInt(
                  (camera_id === -2 ? styles.squareFrameStyle.width : styles.frameStyle.width), 10
                ) - 72}
                y={6}
                width={66}
                height={18}
                rx={3}
                fill="rgba(0,0,0,0.55)"
              />
              <text
                x={parseInt(
                  (camera_id === -2 ? styles.squareFrameStyle.width : styles.frameStyle.width), 10
                ) - 39}
                y={19}
                textAnchor="middle"
                fontSize="10"
                fontFamily="monospace"
                fill="white"
              >
                {`F: ${forceValue.toFixed(2)} N`}
              </text>
            </g>
          )}
        </svg>
        )}

        <div style={styles.bboxDebug}>
          boxes: {detections.length}
        </div>
      </div>

      <details style={styles.controlsMenu}>
        <summary style={{ fontWeight: 'bold', padding: '2px' }}>
          Controls
        </summary>

        <div style={{ padding: '4px' }}>
          <div>
            <button
              onClick={() => streamUpdateFunc(camera_id, false, 0)}
              style={styles.startButton}
            >
              Stop Stream
            </button>

            <input
              style={styles.inputStyle}
              type="text"
              value={desired_fps}
              onChange={(e) => {
                if (e.target.value.length > 2) {
                  e.target.value = e.target.value.substring(0, 2);
                }

                const fps = parseInt(e.target.value);

                if (!isNaN(fps)) {
                  if (fps > 0 && e.target.value[0] === '0') {
                    e.target.value = e.target.value.substring(1);
                  }

                  setDesiredFps(e.target.value);
                } else if (e.target.value === '') {
                  setDesiredFps('0');
                }
              }}
            />

            <button
              onClick={() => change_fps(parseInt(desired_fps))}
              style={styles.startButton}
            >
              Set FPS
            </button>
          </div>

          <div style={{ marginTop: '8px' }}>
            <select
              style={styles.clickFix}
              onChange={(e) =>
                setCurrentResolution(parseInt(e.target.value))
              }
              defaultValue={currentResolution}
            >
              {resolutions.map((resObj, index) => (
                <option key={index} value={resObj.quality_id}>
                  {resObj.res}
                </option>
              ))}
            </select>

            <button
              style={styles.startButton}
              onClick={() => change_res(currentResolution)}
            >
              Set Resolution
            </button>
          </div>

          <div style={{ marginTop: '8px' }}>
            <button
              style={styles.hwResetButton}
              onClick={() => hardwareRestart()}
            >
              Hardware Restart
            </button>

            <button
              onClick={() => flip(camera_id)}
              style={styles.utilityButton}
            >
              Flip
            </button>

            <button
              onClick={() => setShowBoxes((prev) => !prev)}
              style={styles.utilityButton}
            >
              {showBoxes ? 'Hide Boxes' : 'Show Boxes'}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
};

const styles = {
  container: {
    position: 'absolute',
    transform: 'translateY(55px)',
    pointerEvents: 'none',
    backgroundColor: 'lightgray',
    padding: '4px',
    borderRadius: '6px',
  },

  ID_display: {
    borderRadius: '8px',
    margin: '3px',
    position: 'absolute',
    fontSize: '2em',
    color: 'white',
    backgroundColor: 'gray',
    opacity: 0.4,
    zIndex: 25,
    pointerEvents: 'none',
  },

  cameraViewport: {
    position: 'relative',
    display: 'inline-block',
    width: 'fit-content',
    height: 'fit-content',
    overflow: 'hidden',
    backgroundColor: 'black',
  },

  cameraFrame: {
    width: '320px',
    height: '180px',
    border: 'none',
    display: 'block',
  },

  bboxOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: 15,
    pointerEvents: 'none',
  },

  bboxDebug: {
    position: 'absolute',
    left: '4px',
    top: '4px',
    zIndex: 30,
    color: 'lime',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '4px',
    pointerEvents: 'none',
  },

  frameStyle: {
    border: 'none',
  },

  squareFrameStyle: {
    border: 'none',
  },

  startButton: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: '#FF4B10',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    pointerEvents: 'auto',
    cursor: 'pointer',
  },

  inputStyle: {
    width: '3.5rem',
    pointerEvents: 'auto',
  },

  hwResetButton: {
    padding: '3px 8px',
    backgroundColor: '#FF2222',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    pointerEvents: 'auto',
    cursor: 'pointer',
  },

  utilityButton: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: '#8E98FF',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    marginRight: '5px',
  },

  clickFix: {
    pointerEvents: 'auto',
  },

  controlsMenu: {
    position: 'absolute',
    bottom: '8px',
    right: '10px',
    pointerEvents: 'auto',
    cursor: 'pointer',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    zIndex: 40,
    boxShadow: '0px 2px 5px rgba(0,0,0,0.5)',
  },
};

export default SingleCam;