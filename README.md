# ros2-rover-gui

React-based ground station for the rover. The app currently provides these main views:

- Home dashboard
- Map planning and autonomy controls
- Science controls and spectrometer tools
- Camera monitoring
- Manipulator controls and telemetry

The right sidebar stays available across the app and includes the screenshot tool, robot visualizer, amps display, sensor widgets, arm controls, gimbal controls, belly gimbal controls, pose data, and the debug console when enabled.

## Requirements

- Node.js and npm
- A ROS 2 workspace with `rosbridge_server` installed
- Python 3 for the helper scripts

If you are using a conda environment, deactivate it before launching the GUI:

```bash
conda deactivate
```

## Install

Install ROS and npm dependencies with:

```bash
./install_dependencies.bash
```

If you prefer to install them manually, the script currently installs:

- `ros-humble-rosbridge-suite`
- `roslib`
- `react-joystick-component`
- `recharts`

## Start the GUI

### Option 1: start everything with the helper script

From the repository root:

```bash
./start_gui.bash
```

That script:

- sources `~/workspace-newrobot2026/install/setup.bash`
- launches `rosbridge_websocket`
- runs `npm install`
- starts the React app with `npm start`
- serves the map assets with `npx http-server ./src/components/Map/ --cors`

If your ROS workspace lives somewhere else, update the `source` line in `start_gui.bash` before running it.

### Option 2: run each process manually

Run these from separate terminals:

```bash
# ROS websocket bridge
source <ros_workspace>/install/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

```bash
# React GUI
cd ros2-rover-gui
npm install
npm start
```

```bash
# Map static file server used by the map page
cd ros2-rover-gui
npx http-server ./src/components/Map/ --cors
```

## Companion tools

These are optional helpers that are commonly run alongside the GUI:

### Cameras

The camera view expects a UDP-to-WebSocket bridge and, for testing, a fake camera sender.

```bash
cd ros2-rover-gui
node src/components/Cameras/udp_to_ws.jsx
```

```bash
cd ros2-rover-gui
python3 src/components/Cameras/test_webcam.py
```

### Manipulator visualizer

Launch the URDF visualizer that matches the robot configuration you want to inspect:

```bash
cd ros2-rover-gui
python3 urdf2026.py
```

```bash
cd ros2-rover-gui
python3 fullrover2026.py
```

If you want the fake arm motion controller, run:

```bash
cd ros2-rover-gui
python3 fakecontroller.py
```

## Current GUI behavior

### Map

The map page supports:

- waypoint placement with `Ctrl + Click`
- manual waypoint entry
- CSV import/export
- waypoint reordering and deletion
- follow-rover mode
- distance measuring
- autonomy controls such as queue pop, clear queue, toggle autonomy, and speed setting
- search pattern preview and commit for waypoints
- live rover telemetry such as distance, speed, and ETA

### Science

The science page currently includes:

- spectrometer file browsing and data collection
- live absorbance plotting
- baseline capture and reset
- snapshot capture
- pump, cache, carousel, drill, and relay controls
- panorama and gimbal controls

### Cameras

The camera page provides camera widgets and controls for the live rover feeds.

### Manipulator

The manipulator page provides arm, rail, and telemetry controls for the manipulator subsystem.

## Notes

- The GUI connects to ROS through `rosbridge` on `ws://localhost:9090`.
- The map page uses locally served map assets, which is why the helper script also starts `http-server`.
- Several Python files under `src/components/` are standalone test or mock nodes rather than part of the React runtime.