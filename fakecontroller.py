import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
import math
import time

class FakeController(Node):
    def __init__(self):
        super().__init__('fake_controller')
        self.publisher_ = self.create_publisher(JointState, '/manipulator/joint_pos', 10)
        self.timer = self.create_timer(0.1, self.timer_callback)
        self.start_time = time.time()
        self.get_logger().info("Fake Controller Started! Waving the 2026 robot...")

    def timer_callback(self):
        msg = JointState()
        msg.header.stamp = self.get_clock().now().to_msg()
        
        # These names match the keys in the JOINT_MAP in your subscriber script
        msg.name = ['linear_rail', 'shoulder', 'elbow', 'wrist_pitch', 'wrist_roll', 'claw']
        
        t = time.time() - self.start_time
        
        # --- CALCULATE FAKE POSITIONS (BOUNDED FOR 2026 URDF) ---
        
        # linear_rail limits: [-0.46, 0.035] meters
        rail_pos = -0.2 + 0.15 * math.sin(t)        # Oscillates safely between -0.35m and -0.05m
        
        # shoulder limits: [-3.14, 3.14] rad
        shoulder_pos = 45.0 * math.sin(t * 0.9)     # +/- 45 degrees
        
        # elbow limits: [-3.14, 3.14] rad
        elbow_pos = 45.0 + 45.0 * math.sin(t * 0.8) # Oscillates between 0 and 90 degrees
        
        # wrist_pitch limits: [-0.61, 3.39] rad (approx -35 to 194 degrees)
        wrist_p = 45.0 + 30.0 * math.sin(t * 1.2)   # Oscillates safely between 15 and 75 degrees
        
        # wrist_roll limits: [-3.14, 3.14] rad
        wrist_r = 90.0 * math.sin(t * 0.5)          # +/- 90 degrees
        
        # gripper (claw) limits: [-0.075, 0.064] meters
        # Note: Your subscriber script blindly converts all non-rail inputs from degrees to radians.
        # So we pass "3.0 degrees" here, which the subscriber converts to ~0.052, landing safely in the meter limit!
        claw_pos = 3.0 * math.sin(t * 2.0)          
        
        msg.position = [rail_pos, shoulder_pos, elbow_pos, wrist_p, wrist_r, claw_pos]
        
        self.publisher_.publish(msg)

def main():
    rclpy.init()
    node = FakeController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
