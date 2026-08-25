import rclpy
from rclpy.node import Node
from sensor_msgs.msg import NavSatFix
from std_msgs.msg import Bool, Empty
import math
import time


class FakeMissionRover(Node):

    def __init__(self):
        super().__init__('fake_mission_rover')

        # Publishers
        self.gps_pub = self.create_publisher(
            NavSatFix,
            '/mavros/global_position/global',
            10
        )

        self.goal_pub = self.create_publisher(
            Bool,
            '/autonomy/goal_alert',
            10
        )

        self.auto_pub = self.create_publisher(
            Bool,
            '/autonomy/is_autonomous',
            10
        )

        self.pop_pub = self.create_publisher(
            Empty,
            '/autonomy/waypoint_pop',
            10
        )

        # Starting position (MDRS)
        self.lat = 38.4063
        self.lon = -110.7916

        # Simulated waypoint queue
        self.waypoints = [
            (38.4066, -110.7916),
            (38.4066, -110.7912),
            (38.4063, -110.7912),
        ]

        self.current_index = 0
        self.speed_mps = 1.5
        self.publish_rate = 10.0
        self.dt = 1.0 / self.publish_rate

        self.arrival_radius = 1.0  # meters

        self.timer = self.create_timer(self.dt, self.update)

        self.get_logger().info("Fake Mission Rover Started")

    # -------------------------
    # Haversine distance (meters)
    # -------------------------
    def distance(self, lat1, lon1, lat2, lon2):
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = (math.sin(dphi/2)**2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(dlambda/2)**2)

        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    # -------------------------
    # Move toward waypoint
    # -------------------------
    def move_toward(self, target_lat, target_lon):
        dist = self.distance(self.lat, self.lon, target_lat, target_lon)

        if dist < self.arrival_radius:
            return True  # arrived

        # compute direction
        dlat = target_lat - self.lat
        dlon = target_lon - self.lon

        norm = math.sqrt(dlat**2 + dlon**2)
        if norm == 0:
            return False

        step_m = self.speed_mps * self.dt

        # Convert meters to degrees approx
        meters_to_deg = 1.0 / 111111.0
        step_deg = step_m * meters_to_deg

        self.lat += (dlat / norm) * step_deg
        self.lon += (dlon / norm) * step_deg

        return False

    # -------------------------
    # Main update loop
    # -------------------------
    def update(self):

        # Always publish autonomy status
        auto_msg = Bool()
        auto_msg.data = True
        self.auto_pub.publish(auto_msg)

        if self.current_index >= len(self.waypoints):
            return

        target = self.waypoints[self.current_index]
        arrived = self.move_toward(target[0], target[1])

        # Publish GPS
        gps_msg = NavSatFix()
        now = time.time()
        gps_msg.header.stamp.sec = int(now)
        gps_msg.header.stamp.nanosec = int((now % 1) * 1e9)
        gps_msg.latitude = self.lat
        gps_msg.longitude = self.lon
        gps_msg.altitude = 0.0
        self.gps_pub.publish(gps_msg)

        # Handle arrival
        if arrived:
            self.get_logger().info(f"Arrived at waypoint {self.current_index}")

            goal_msg = Bool()
            goal_msg.data = True
            self.goal_pub.publish(goal_msg)

            # Simulate queue pop
            self.pop_pub.publish(Empty())

            self.current_index += 1

            time.sleep(1.0)  # pause at waypoint

            goal_msg.data = False
            self.goal_pub.publish(goal_msg)


def main():
    rclpy.init()
    node = FakeMissionRover()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()