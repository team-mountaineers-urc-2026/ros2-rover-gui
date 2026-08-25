import React, { useState, useEffect, useRef } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const bellyTopic = new ROSLIB.Topic({
  ros: ros,
  name: '/belly_move_pos',
  messageType: 'std_msgs/msg/Float32',
});

const BellyGimbalControl = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [angle, setAngle] = useState(0.0);
  const [inputVal, setInputVal] = useState('');
  const [keyboardActive, setKeyboardActive] = useState(false);

  const BELLY_MIN = -55.0;
  const BELLY_MAX = 45.0;
  const STEP = 5.0;

  const publishBellyPos = (pos) => {
    const clamped = Math.max(BELLY_MIN, Math.min(BELLY_MAX, pos));
    const msg = new ROSLIB.Message({ data: clamped });
    bellyTopic.publish(msg);
    console.log(`Belly gimbal → ${clamped}°`);
  };

  useEffect(() => {
    const listener = new ROSLIB.Topic({
      ros: ros,
      name: '/belly_move_pos',
      messageType: 'std_msgs/msg/Float32',
    });

    listener.subscribe((message) => {
      const newAngle = message.data;
      setAngle(newAngle);
      setInputVal(String(newAngle));
    });

    return () => listener.unsubscribe();
  }, []);

  const step = (dir) => {
    publishBellyPos(angle + dir * STEP);
  };

  const handleManualSet = () => {
    const val = parseFloat(inputVal);
    if (!isNaN(val)) publishBellyPos(val);
  };

  const trackRef = useRef(null);

  const handleTrackInteract = (clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = x / rect.width;
    publishBellyPos(BELLY_MIN + pct * (BELLY_MAX - BELLY_MIN));
  };

  const handleMouseDown = (e) => {
    handleTrackInteract(e.clientX);
    const handleMouseMove = (moveEvent) => handleTrackInteract(moveEvent.clientX);
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (!keyboardActive) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboardActive, angle]);

  const pct = ((angle - BELLY_MIN) / (BELLY_MAX - BELLY_MIN)) * 100;
  const zeroPct = ((0 - BELLY_MIN) / (BELLY_MAX - BELLY_MIN)) * 100;

  return (
        <div style={styles.body}>
          {/* Angle readout */}
          <div style={styles.readout}>
            <span style={styles.readoutLabel}>Angle</span>
            <span style={styles.readoutValue}>{angle.toFixed(1)}°</span>
          </div>

          {/* Slider bar */}
          <div
            style={styles.barTrack}
            ref={trackRef}
            onMouseDown={handleMouseDown}
          >
            <div style={{ ...styles.barFill, width: `${pct}%`, transition: 'none' }} />
            <div style={{ ...styles.barThumb, left: `calc(${pct}% - 8px)`, transition: 'none' }} />
          </div>
          <div style={styles.barLabels}>
            <span style={{ position: 'absolute', left: 0 }}>{BELLY_MIN}°</span>
            <span style={{ position: 'absolute', left: `${zeroPct}%`, transform: 'translateX(-50%)' }}>0°</span>
            <span style={{ position: 'absolute', right: 0 }}>{BELLY_MAX}°</span>
          </div>

          {/* Up / Down / Center */}
          <div style={styles.dpadRow}>
            <button style={styles.arrowBtn} onClick={() => step(1)}>⬆</button>
            <button style={styles.centerBtn} onClick={() => publishBellyPos(0)}>Center</button>
            <button style={styles.arrowBtn} onClick={() => step(-1)}>⬇</button>
          </div>

          {/* Manual input */}
          <div style={styles.manualRow}>
            <input
              type="number"
              min={BELLY_MIN}
              max={BELLY_MAX}
              style={styles.input}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="°"
            />
            <button style={styles.setBtn} onClick={handleManualSet}>Set</button>
          </div>

          {/* Keyboard toggle */}
          <button
            style={keyboardActive ? styles.kbOn : styles.kbOff}
            onClick={() => setKeyboardActive(!keyboardActive)}
          >
            ⌨ Keyboard: {keyboardActive ? 'ON' : 'OFF'}
          </button>
          {keyboardActive && (
            <div style={styles.kbHint}>W / ↑ = up &nbsp;|&nbsp; S / ↓ = down</div>
          )}
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
    padding: '12px 14px',
  },
  readout: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' },
  readoutLabel: { fontSize: '13px', color: '#666' },
  readoutValue: { fontSize: '22px', fontWeight: 'bold', color: '#FF4B10' },
  barTrack: { position: 'relative', height: '8px', backgroundColor: '#ddd', borderRadius: '4px', marginBottom: '4px', cursor: 'pointer' },
  barFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: '#8E98FF', borderRadius: '4px' },
  barThumb: { position: 'absolute', top: '-4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FF4B10', cursor: 'grab' },
  barLabels: { position: 'relative', height: '15px', fontSize: '11px', color: '#888', marginBottom: '12px' },
  dpadRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  arrowBtn: { width: '40px', height: '40px', fontSize: '20px', backgroundColor: '#8E98FF', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  centerBtn: { padding: '5px 12px', backgroundColor: '#FF4B10', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  manualRow: { display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' },
  input: { width: '65px', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', textAlign: 'center' },
  setBtn: { padding: '4px 10px', backgroundColor: '#FF4B10', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  kbOff: { width: '100%', padding: '6px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  kbOn: { width: '100%', padding: '6px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 8px rgba(76,175,80,0.6)' },
  kbHint: { fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '5px' },
};

export default BellyGimbalControl;