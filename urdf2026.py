"""
import sys
import numpy as np
import time

try:
    from pydrake.geometry import Meshcat
    from pydrake.multibody.parsing import Parser
    from pydrake.multibody.plant import AddMultibodyPlantSceneGraph
    from pydrake.systems.framework import DiagramBuilder
    from pydrake.visualization import AddDefaultVisualization
    from pydrake.multibody.tree import JointIndex
except Exception as exc:
    print("CRITICAL: Drake (pydrake) failed to initialize.")
    print("This usually indicates an incompatible or partial pydrake install.")
    print(f"Details: {exc}")
    sys.exit(1)

from matplotlib import pyplot as plt
from matplotlib.widgets import Slider

# ==========================================================
# 1. DRAKE & MESHCAT SETUP
# ==========================================================
meshcat = Meshcat(port=7000)
print(f"If it doesn't open automatically, go to this URL: {meshcat.web_url()}\n")

builder = DiagramBuilder()
plant, scene_graph = AddMultibodyPlantSceneGraph(builder, time_step=0.001)
parser = Parser(plant)

# --- MAP TO MESHES ---
assets_path = "/home/urc/ros2-rover-gui/public/models/manipulator/meshes"
parser.package_map().Add("assets", assets_path)

# --- LOAD CLEAN URDF ---
urdf_path = "/home/urc/ros2-rover-gui/public/models/manipulator/urdf/robot_clean.urdf"
parser.AddModels(urdf_path)

plant.Finalize()

AddDefaultVisualization(builder=builder, meshcat=meshcat)
diagram = builder.Build()
context = diagram.CreateDefaultContext()
plant_context = plant.GetMyContextFromRoot(context)

num_positions = plant.num_positions()
print(f"Robot has {num_positions} positions\n")

initial_q = plant.GetPositions(plant_context).copy()
quaternion_joints = []

variable_positions = []

for i in range(plant.num_joints()):
    joint = plant.get_joint(JointIndex(i))
    jtype = joint.type_name()
    npos = joint.num_positions()
    
    # Handle quaternion bases
    if jtype == "quaternion_floating" and npos >= 4:
        start = joint.position_start()
        initial_q[start:start + 4] = np.array([1.0, 0.0, 0.0, 0.0])
        if npos > 4:
            initial_q[start + 4:start + npos] = 0.0
        quaternion_joints.append((start, npos))
        continue
        
    # Skip fixed joints
    if npos == 0:
        continue

    # Get the exact index in Drake's internal state array
    start_idx = joint.position_start()
    
    for local_idx in range(npos):
        global_idx = start_idx + local_idx
        low = float(joint.position_lower_limits()[local_idx])
        high = float(joint.position_upper_limits()[local_idx])
        
        if np.isfinite(low) and np.isfinite(high) and not np.isclose(low, high):
            variable_positions.append((global_idx, joint.name(), local_idx, low, high))
        else:
            if jtype.startswith("revolute"):
                fb_low, fb_high = -np.pi, np.pi
            elif jtype.startswith("prismatic"):
                fb_low, fb_high = -0.1, 0.1
            else:
                continue
            print(f"Warning: joint '{joint.name()}' pos {local_idx} had no finite limits; using fallback.")
            variable_positions.append((global_idx, joint.name(), local_idx, float(fb_low), float(fb_high)))

plant.SetPositions(plant_context, initial_q)
diagram.ForcedPublish(context)
print("\nWaiting for MeshCat to load...")
time.sleep(3)


if not variable_positions:
    print("No adjustable joints with valid limits found; showing static model.")
    plt.show()
else:
    fig, axes = plt.subplots(len(variable_positions), 1, figsize=(6, max(2.5, len(variable_positions) * 0.7)))
    if len(variable_positions) == 1:
        axes = [axes]
    plt.subplots_adjust(left=0.35, right=0.95, hspace=0.6)

    slider_controls = []
    # Note: `global_idx` ensures we are altering the exact correct number in Drake's array
    for ax, (global_idx, joint_name, pos_idx, lower, upper) in zip(axes, variable_positions):
        norm_init = float(np.clip((initial_q[global_idx] - lower) / (upper - lower), 0.0, 1.0))
        slider = Slider(ax, f"{joint_name}[{pos_idx}]", 0.0, 1.0, valinit=norm_init)
        slider_controls.append((global_idx, lower, upper, slider))

    def apply_slider_positions(_):
        q = plant.GetPositions(plant_context).copy()
        
        # Apply slider values specifically to their assigned global index
        for global_idx, lower, upper, slider in slider_controls:
            q[global_idx] = lower + slider.val * (upper - lower)
            
        # Re-enforce quaternion defaults if necessary
        for start, npos in quaternion_joints:
            quat = q[start:start + 4]
            if np.allclose(quat, 0.0):
                q[start:start + 4] = np.array([1.0, 0.0, 0.0, 0.0])
                
        plant.SetPositions(plant_context, q)
        diagram.ForcedPublish(context)

    for _, _, _, slider in slider_controls:
        slider.on_changed(apply_slider_positions)

    apply_slider_positions(None)
    print("Slider GUI Active! Close the slider window to exit.")
    plt.show()

print("Exiting...")
"""
import sys
import numpy as np
import time

try:
    from pydrake.geometry import Meshcat
    from pydrake.multibody.parsing import Parser
    from pydrake.multibody.plant import AddMultibodyPlantSceneGraph
    from pydrake.systems.framework import DiagramBuilder
    from pydrake.visualization import AddDefaultVisualization
    from pydrake.multibody.tree import JointIndex
except Exception as exc:
    print("CRITICAL: Drake (pydrake) failed to initialize.")
    sys.exit(1)

import rclpy
from sensor_msgs.msg import JointState

# ==========================================================
# 1. DRAKE & MESHCAT SETUP
# ==========================================================
meshcat = Meshcat(port=7000)
print(f"If it doesn't open automatically, go to this URL: {meshcat.web_url()}\n")

builder = DiagramBuilder()
plant, scene_graph = AddMultibodyPlantSceneGraph(builder, time_step=0.001)
parser = Parser(plant)

# Map the "assets" package to your actual meshes folder
assets_path = "/home/urc/ros2-rover-gui/public/models/manipulator/meshes"
parser.package_map().Add("assets", assets_path)

# Load the clean URDF (without the missing mesh crashes)
urdf_path = "/home/urc/ros2-rover-gui/public/models/manipulator/urdf/robot_clean.urdf"
parser.AddModels(urdf_path)

plant.Finalize()

AddDefaultVisualization(builder=builder, meshcat=meshcat)
diagram = builder.Build()
context = diagram.CreateDefaultContext()
plant_context = plant.GetMyContextFromRoot(context)

initial_q = plant.GetPositions(plant_context).copy()

# Handle any floating quaternions (prevents crashes on some joints)
quaternion_joints = []
for i in range(plant.num_joints()):
    joint = plant.get_joint(JointIndex(i))
    npos = joint.num_positions()
    if joint.type_name() == "quaternion_floating" and npos >= 4:
        start = joint.position_start()
        initial_q[start:start + 4] = np.array([1.0, 0.0, 0.0, 0.0])
        if npos > 4:
            initial_q[start + 4:start + npos] = 0.0
        quaternion_joints.append((start, npos))

plant.SetPositions(plant_context, initial_q)
diagram.ForcedPublish(context)

print("\nWaiting for MeshCat to load...")
time.sleep(3)

# ==========================================================
# 2. ROS 2 NODE & MAPPING SETUP
# ==========================================================
rclpy.init()
node = rclpy.create_node('drake_visualizer')

# Maps the ROS topic names to the URDF joint names
JOINT_MAP = {
    'linear_rail': 'linear_rail',
    'shoulder': 'sholder_motor',
    'elbow': 'elbow',
    'wrist_pitch': 'wrist_pitch',
    'wrist_roll': 'wrist_roll',
    'claw': 'gripper'
}

def ros_callback(msg):
    current_positions = plant.GetPositions(plant_context).copy()
    
    for i, name in enumerate(msg.name):
        if name in JOINT_MAP:
            urdf_name = JOINT_MAP[name]
            val = msg.position[i]
            
            # Convert Degrees to Radians (except for the rail)
            if name != 'linear_rail':
                val = val * (np.pi / 180.0)
                
            try:
                joint = plant.GetJointByName(urdf_name)
                # Use position_start() to fix the scrambled joint mapping!
                idx = joint.position_start()
                current_positions[idx] = val
            except Exception:
                pass
    
    # Re-enforce quaternion defaults just in case
    for start, npos in quaternion_joints:
        quat = current_positions[start:start + 4]
        if np.allclose(quat, 0.0):
            current_positions[start:start + 4] = np.array([1.0, 0.0, 0.0, 0.0])
            
    plant.SetPositions(plant_context, current_positions)
    diagram.ForcedPublish(context)

node.create_subscription(JointState, '/manipulator/joint_pos', ros_callback, 10)

# ==========================================================
# 3. MAIN EXECUTION LOOP
# ==========================================================
print("ROS 2 Visualizer Running! Waiting for JointState messages on /manipulator/joint_pos...")
try:
    while rclpy.ok():
        rclpy.spin_once(node, timeout_sec=0.01)
        time.sleep(0.01)
except KeyboardInterrupt:
    print("\nShutting down visualizer...")
finally:
    node.destroy_node()
    rclpy.shutdown()
 
