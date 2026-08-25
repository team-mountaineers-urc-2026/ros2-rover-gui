import React, { useState } from 'react';

// Returns camera of form {id, }
function new_camera(id, name) {
  const f = false
  return { id, name, f };
}

// IDs
const Fisheye_id = 41;
const wrist_id = 12;
const elbow_id = 33;
const front_id = 44;
const r_hip_id = 43;
const l_hip_id = 34;
const rear_under_id = 37;
const front_under_id = 40;
const gimbal_id = 39;
const scoops_id = 36;
const carousel_id = 35;
const drill_id = 38;
const realsense_id = -1;
const linrail_id = 67;
const cam45 = 45;

// Names (rect elements)
const fisheye_cam_name = 'camera' + Fisheye_id;
const wrist_cam_name = 'camera' + wrist_id;
const elbow_cam_name = 'camera' + elbow_id;
const front_cam_name = 'camera' + front_id;
const r_hip_cam_name = 'camera' + r_hip_id;
const l_hip_cam_name = 'camera' + l_hip_id;
const rear_under_cam_name = 'camera' + rear_under_id;
const front_under_cam_name = 'camera' + front_under_id;
const gimbal_cam_name = 'camera' + gimbal_id;
const scoops_cam_name = 'camera' + scoops_id;
const carousel_cam_name = 'camera' + carousel_id;
const drill_cam_name = 'camera' + drill_id;
const realsense_cam_name = 'camera' + realsense_id;
const linrail_cam_name = 'camera' + linrail_id;
const cam45_name = 'camera' + cam45;

// Add camera information to this list as you figure them out
const cameras = [
  new_camera(Fisheye_id, 'Right Side Cam'),
  new_camera(wrist_id, 'Wrist Camera'),
  new_camera(elbow_id, 'Elbow'),
  new_camera(front_id, 'Front View'),
  new_camera(r_hip_id, 'Right Hip'),
  new_camera(l_hip_id, 'Left Hip'),
  new_camera(rear_under_id, 'Rear view under'),
  new_camera(front_under_id, 'Front bumper Cam'),
  new_camera(gimbal_id, 'Gimbal'),
  new_camera(scoops_id, 'Left side Cam'),
  new_camera(carousel_id, 'Carousel'),
  new_camera(drill_id, 'Back Cam'),
  new_camera(realsense_id, "Realsense"),
  new_camera(linrail_id, "Linrail Cam"),
  new_camera(cam45, "Cam 45")
]

/** Copied from settings.hpp */
const qualities = [
  'Soulja (160x90, 5fps)',
  'low (320x180, 5fps)',
  'lowish (320x180, 10fps)',
  'okay (slow) (640x360, 5fps)',
  'okay (640x360, 10fps)',
  'okayer (640x360, 15fps)',
  'medium (1280x720, 10fps)',
  'medium-er (1280x720, 15fps)',
  'high (slow) (1920x1080, 5fps)',
  'high (1920x1080, 10fps)',
  'higher (1920x1080, 15fps)',
  'highest (1920x1080, 20fps)'
]

const presetOptions = [
  { id: 'driver', label: 'Driver Mode' },
  { id: 'arm_delivery', label: 'Arm: Delivery' },
  { id: 'arm_es', label: 'Arm: ES' },
  { id: 'science', label: 'Science' },
  { id: 'autonomy', label: 'Autonomy'}
];

const CamControlHeader = ({ streamUpdateFunc, camBarList }) => {
  const [selectedCameraId, setSelectedCameraId] = useState(cameras[0].id);
  const [currentQuality, setCurrentQuality] = useState(2);
  const [selectedPreset, setSelectedPreset] = useState(presetOptions[0].id);

  // States to manage dynamic inline hover effects using CSS variables
  const [hoverButton, setHoverButton] = useState(null);

  const handleLaunch = () => {
    switch (selectedPreset) {
      case 'driver':
        streamUpdateFunc(front_under_id, true, 2);
        streamUpdateFunc(r_hip_id, true, 2);
        streamUpdateFunc(gimbal_id, true, 2);
        streamUpdateFunc(cam45, true, 2);
        streamUpdateFunc(front_id, true, 2);
        streamUpdateFunc(drill_id, true, 2);
        streamUpdateFunc(Fisheye_id, true, 2);
        streamUpdateFunc(elbow_id, true, 2);
        streamUpdateFunc(l_hip_id, true, 2);
        break;
      case 'arm_delivery':
        streamUpdateFunc(wrist_id, true, 2);
        streamUpdateFunc(elbow_id, true, 2);
        streamUpdateFunc(front_under_id, true, 2);
        streamUpdateFunc(front_id, true, 1);
        streamUpdateFunc(Fisheye_id, true, 2);
        break;
      case 'arm_es':
        streamUpdateFunc(wrist_id, true, 2);
        streamUpdateFunc(elbow_id, true, 4);
        streamUpdateFunc(front_under_id, true, 2);
        streamUpdateFunc(front_id, true, 1);
        streamUpdateFunc(gimbal_id, true, 2);
        streamUpdateFunc(linrail_id,true, 2);
        break;
      case 'science':
        streamUpdateFunc(front_under_id, true, 2);
        streamUpdateFunc(scoops_id, true, 2);
        streamUpdateFunc(gimbal_id, true, 2);
        streamUpdateFunc(drill_id, true, 2);
        streamUpdateFunc(carousel_id, true, 2);
        streamUpdateFunc(elbow_id, true, 2);
        streamUpdateFunc(Fisheye_id, true, 2);
        break;
      case 'autonomy':
        streamUpdateFunc(Fisheye_id, true, 2);
        streamUpdateFunc(front_id,true,2);
        streamUpdateFunc(scoops_id, true, 2);
        streamUpdateFunc(drill_id, true, 2);
        break;
      default:
        break;
    }
  };

  const handleArrange = () => {
    if (!camBarList) return;

    const moveRect = (name, left, top, scaleX, scaleY) => {
      const rect = camBarList.find(obj => obj.name === name);
      if (rect) {
        rect.set({ left, top, scaleX, scaleY });
        rect.setCoords();
        rect.fire('moving');
        rect.fire('scaling');
      }
    };

    switch (selectedPreset) {
      case 'driver':
        moveRect(front_under_cam_name, 804, 5, 1.56, 1.56);
        moveRect(r_hip_cam_name, 1530, 5, 1.73, 1.73);
        moveRect(gimbal_cam_name, 1463, 324, 2.24, 2.24);
        moveRect(cam45_name, 1464, 741, 2.40, 2.40);
        moveRect(front_cam_name, 575, 300, 2.75, 2.75);
        moveRect(drill_cam_name, 785, 810, 2.04, 2.04);
        moveRect(fisheye_cam_name, 39, 806, 1.97, 1.97);
        moveRect(elbow_cam_name, 9, 399, 1.74, 1.74);
        moveRect(l_hip_cam_name, 30, 3, 1.68, 1.68);
        break;
      case 'arm_delivery':
      case 'arm_es':
        moveRect(gimbal_cam_name, 1538, 740, 2.09, 2.09);
        moveRect(linrail_cam_name, 879, 743, 2.06, 2.06);
        moveRect(elbow_cam_name, 882, -8, 4.13, 4.13);
        moveRect(wrist_cam_name, 32, -6, 2.63, 2.63);
        moveRect(front_under_cam_name, 30, 471, 2.64, 2.64);
        moveRect(front_cam_name, 30, 952, 1.27, 1.27);
        break;
      case 'science':
        moveRect(front_under_cam_name, 742, 51, 2.20, 2.20);
        moveRect(scoops_cam_name, 19, 589, 2.18, 2.18);
        moveRect(gimbal_cam_name, 735, 471, 2.25, 2.25);
        moveRect(drill_cam_name, 887, 899, 1.33, 1.33);
        moveRect(carousel_cam_name, 24, 171, 2.16, 2.16);
        moveRect(elbow_cam_name, 1471, 202, 2.02, 2.02);
        moveRect(fisheye_cam_name, 1473, 595, 2.01, 2.01);
        break;
      case 'autonomy':
        moveRect(fisheye_cam_name, 1469, 349, 2.23, 2.23);
        moveRect(front_cam_name, 737, 14, 2.28, 2.28);
        moveRect(scoops_cam_name, 19, 332, 2.25, 2.25);
        moveRect(drill_cam_name, 729, 737, 2.39, 2.39);
        break;
      default:
        break;
    }
  };

  // Helper object to apply global hover swaps dynamically for inline elements
  const getButtonStyle = (buttonId) => ({
    ...styles.button,
    backgroundColor: hoverButton === buttonId ? 'var(--button-hover)' : 'var(--button-color)',
  });

  return (
    <div style={styles.headerContainer}>

      {/* Individual Camera Spawner */}
      <div style={styles.controlGroup}>
        <div style={styles.label}>Camera:</div>
        <select
          style={styles.select}
          onChange={(e) => setSelectedCameraId(parseInt(e.target.value))}
        >
          {cameras.map((camera, index) => (
            <option key={index} value={camera.id}>
              {camera.name + ' (' + camera.id + ')'}
            </option>
          ))}
        </select>

        <div style={{ ...styles.label, marginLeft: '10px' }}>Quality:</div>
        <select
          style={styles.select}
          onChange={(e) => setCurrentQuality(parseInt(e.target.value))}
          defaultValue={currentQuality}
        >
          {qualities.map((quality, index) => (
            <option key={quality} value={index}>{quality}</option>
          ))}
        </select>

        <button
          onClick={() => {
            if (currentQuality >= 6) {
              const ret = window.confirm(`Starting a stream at quality ${currentQuality} (${qualities[currentQuality]}) may cause performance issues. Are you sure you want to continue?`);
              if (!ret) return;
            }
            streamUpdateFunc(selectedCameraId, true, currentQuality);
          }}
          onMouseEnter={() => setHoverButton('startStream')}
          onMouseLeave={() => setHoverButton(null)}
          style={getButtonStyle('startStream')}
        >
          Start Stream
        </button>
      </div>

      <div style={styles.verticalDivider}></div>

      {/* Unified Preset Dropdown */}
      <div style={styles.controlGroup}>
        <div style={styles.label}>Preset:</div>
        <select
          style={styles.select}
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
        >
          {presetOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={handleLaunch}
          onMouseEnter={() => setHoverButton('launch')}
          onMouseLeave={() => setHoverButton(null)}
          style={getButtonStyle('launch')}
        >
          Launch
        </button>

        <button
          onClick={handleArrange}
          onMouseEnter={() => setHoverButton('arrange')}
          onMouseLeave={() => setHoverButton(null)}
          style={getButtonStyle('arrange')}
        >
          Auto-Arrange
        </button>

        <button
          onClick={() => {
            if (!camBarList || camBarList.length === 0) {
              console.log("No cameras active to export.");
              return;
            }
            console.log(`\n// --- EXPORTED LAYOUT FOR '${selectedPreset}' ---`);
            camBarList.forEach(rect => {
              const left = Math.round(rect.left);
              const top = Math.round(rect.top);
              const scaleX = rect.scaleX.toFixed(2);
              const scaleY = rect.scaleY.toFixed(2);
              console.log(`moveRect('${rect.name}', ${left}, ${top}, ${scaleX}, ${scaleY});`);
            });
            console.log('// ------------------------------------------\n');
            alert("Layout exported to the console.");
          }}
          onMouseEnter={() => setHoverButton('export')}
          onMouseLeave={() => setHoverButton(null)}
          // Custom override to keep the developer export button purple if desired, or defaults to layout
          style={{
            ...getButtonStyle('export'),
            backgroundColor: hoverButton === 'export' ? '#600060' : '#800080'
          }}
        >
          Dev: Export Layout
        </button>
      </div>

    </div>
  );
};

const styles = {
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 15px',
    backgroundColor: 'var(--header-bg)',
    color: 'var(--header-text)',
    height: '45px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif',
    color: 'var(--text-primary)'

  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  verticalDivider: {
    width: '1px',
    height: '25px',
    backgroundColor: '#555',
    margin: '0 15px',
    color: 'var(--text-primary)',

  },
  label: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  },
  select: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  button: {
    padding: '5px 15px',
    marginLeft: '5px',
    color: 'var(--text-primary)',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }
};

export default CamControlHeader;