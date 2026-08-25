import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
import numpy as np

class RoverMockController(Node):
    def __init__(self):
        super().__init__('rover_mock_controller')
        self.publisher_ = self.create_publisher(JointState, '/manipulator/joint_pos', 10)
        
        # Timer to publish at 20Hz (0.05 seconds)
        self.timer = self.create_timer(0.05, self.timer_callback)
        
        # Movement States
        self.wheel_rotation = 0.0
        self.time_step = 0.0
        
        # --- CONFIGURATION ---
        self.drive_speed = 4.0   # Lower = slower wheel spin
        self.rail_range = 0.2    # Meters to move back and forth
        self.claw_range = 0.05   # Degrees to open/close
        # ---------------------

        print("Enhanced Mock Controller Started.")
        print("Driving wheels (Fixed Front Direction) + Animating Arm & Rail...")

    def timer_callback(self):
        msg = JointState()
        msg.header.stamp = self.get_clock().now().to_msg()
        
        # 1. Update Wheels (Front Inverted, Back Normal)
        self.wheel_rotation = (self.wheel_rotation + self.drive_speed) % 360
        
        # 2. Update Arm/Rail using Sine waves for smooth back-and-forth movement
        self.time_step += 0.05
        current_rail = abs(np.sin(self.time_step * 0.5)) * self.rail_range
        current_claw = abs(np.sin(self.time_step * 1.5)) * self.claw_range

        msg.name = [
            'front_left_wheel', 
            'front_right_wheel', 
            'back_left_wheel', 
            'back_right_wheel',
            'linear_rail',
            'claw',
            'shoulder',
            'elbow'
        ]
        
        # Values sent to your Visualizer JOINT_MAP
        msg.position = [
            float(-self.wheel_rotation), # FRONT LEFT (Inverted)
            float(-self.wheel_rotation), # FRONT RIGHT (Inverted)
            float(self.wheel_rotation),  # BACK LEFT
            float(self.wheel_rotation),  # BACK RIGHT
            float(current_rail),         # Linear Rail (meters)
            float(current_claw),         # Claw (degrees)
            -15.0,                       # Static shoulder angle for better view
            45.0                         # Static elbow angle for better view
        ]

        self.publisher_.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = RoverMockController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        print("\nStopping Mock Controller...")
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
