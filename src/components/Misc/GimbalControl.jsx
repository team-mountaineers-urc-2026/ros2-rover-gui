import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const gimbalTopic = new ROSLIB.Topic({
  ros: ros,
  name: '/gimbal_move_pos',
  messageType: 'sensor_msgs/msg/JointState',
});

const GimbalControl = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [yaw, setYaw] = useState('');
  const [pitch, setPitch] = useState('');
  const [keyboardActive, setKeyboardActive] = useState(false);

  const YAW_LIMIT = 180.0;
  const PITCH_MIN = -58.0;
  const PITCH_MAX = 90.0;
  const STEP = 5.0;

  const publishGimbalState = (targetYaw, targetPitch) => {
    const finalYaw = parseFloat(targetYaw) || 0.0;
    const finalPitch = parseFloat(targetPitch) || 0.0;

    const jointMsg = new ROSLIB.Message({
      header: { stamp: { sec: 0, nanosec: 0 }, frame_id: '' },
      name: ['yaw', 'pitch'],
      position: [finalYaw, finalPitch],
      velocity: [],
      effort: []
    });

    gimbalTopic.publish(jointMsg);
    console.log(`Sending to Rover - Yaw: ${finalYaw}, Pitch: ${finalPitch}`);
  };

  useEffect(() => {
    const listener = new ROSLIB.Topic({
      ros: ros,
      name: '/gimbal_move_pos',
      messageType: 'sensor_msgs/msg/JointState',
    });

    listener.subscribe((message) => {
      // Assuming 'yaw' is at index 0 and 'pitch' is at index 1
      if (message.position && message.position.length >= 2) {
        setYaw(message.position[0].toString());
        setPitch(message.position[1].toString());
      }
    });

    return () => listener.unsubscribe();
  }, []);

  const moveGimbal = (axis, direction) => {
    let newYaw = parseFloat(yaw) || 0.0;
    let newPitch = parseFloat(pitch) || 0.0;

    if (axis === 'yaw') {
      if (direction === 'left') newYaw += STEP;
      if (direction === 'right') newYaw -= STEP;
      if (direction === 'center') newYaw = 0.0;
      if (newYaw > YAW_LIMIT) newYaw = YAW_LIMIT;
      if (newYaw < -YAW_LIMIT) newYaw = -YAW_LIMIT;
      setYaw(newYaw);
    } else if (axis === 'pitch') {
      if (direction === 'up') newPitch += STEP;
      if (direction === 'down') newPitch -= STEP;
      if (direction === 'center') newPitch = 0.0;
      if (newPitch > PITCH_MAX) newPitch = PITCH_MAX;
      if (newPitch < PITCH_MIN) newPitch = PITCH_MIN;
      setPitch(newPitch);
    }

    publishGimbalState(newYaw, newPitch);
  };

  useEffect(() => {
    if (!keyboardActive) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault(); moveGimbal('pitch', 'up'); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault(); moveGimbal('pitch', 'down'); break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault(); moveGimbal('yaw', 'left'); break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault(); moveGimbal('yaw', 'right'); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardActive, yaw, pitch]);

  return (
      
        <div style={styles.body}>
          {/* Manual inputs */}
          <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #ccc', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <label>
                Yaw:
                <input
                  type="number"
                  min="-180"
                  max="180"
                  style={{ width: '50px', marginLeft: '5px' }}
                  value={yaw}
                  onChange={(e) => setYaw(e.target.value)}
                />
              </label>
              <label>
                Pitch:
                <input
                  type="number"
                  min="-58"
                  max="90"
                  style={{ width: '50px', marginLeft: '5px' }}
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                />
              </label>
            </div>
            <button style={styles.button} onClick={() => publishGimbalState(yaw, pitch)}>
              Set Gimbal Angles
            </button>
          </div>

          {/* D-pad */}
          <div style={{ textAlign: 'center' }}>
            <div style={styles.dpadGrid}>
              <button onClick={() => moveGimbal('pitch', 'up')}    style={{ ...styles.arrowButton, gridColumn: 2, gridRow: 1 }}>⬆</button>
              <button onClick={() => moveGimbal('yaw', 'left')}    style={{ ...styles.arrowButton, gridColumn: 1, gridRow: 2 }}>⬅</button>
              <button onClick={() => moveGimbal('pitch', 'down')}  style={{ ...styles.arrowButton, gridColumn: 2, gridRow: 2 }}>⬇</button>
              <button onClick={() => moveGimbal('yaw', 'right')}   style={{ ...styles.arrowButton, gridColumn: 3, gridRow: 2 }}>➡</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', borderTop: '1px solid #ccc', paddingTop: '10px', paddingBottom: '10px' }}>
              <button onClick={() => moveGimbal('yaw', 'center')}   style={styles.utilityButton}>Center Yaw</button>
              <button onClick={() => moveGimbal('pitch', 'center')} style={styles.utilityButton}>Center Pitch</button>
            </div>

            <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
              <button
                onClick={() => setKeyboardActive(!keyboardActive)}
                style={keyboardActive ? styles.keyboardButtonActive : styles.keyboardButtonInactive}
              >
                {keyboardActive ? '⌨ Keyboard Control: ON' : '⌨ Keyboard Control: OFF'}
              </button>
              {keyboardActive && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                  Use WASD or Arrow Keys
                </div>
              )}
            </div>
          </div>
        </div>
      )};

const styles = {
  wrapper: {
    border: '1px solid #444',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: 'var(--header-bg, #2a2a2a)',
    color: 'var(--header-text, #fff)',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: '13px',
  },
  toggleBtn: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  body: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: 'black',
    padding: '10px',
  },
  button: { padding: '3px 8px', backgroundColor: '#FF4B10', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  utilityButton: { display: 'inline-block', padding: '5px 10px', backgroundColor: '#8E98FF', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' },
  dpadGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gridTemplateRows: 'repeat(2, 40px)', gap: '3px', justifyContent: 'center', marginBottom: '10px' },
  arrowButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8E98FF', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '20px', width: '100%', height: '100%', padding: 0 },
  keyboardButtonInactive: { width: '100%', padding: '6px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  keyboardButtonActive: { width: '100%', padding: '6px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 8px rgba(76,175,80,0.6)' },
};

export default GimbalControl;