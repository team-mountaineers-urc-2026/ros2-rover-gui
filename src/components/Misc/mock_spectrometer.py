import rclpy
from rclpy.node import Node
import math
import random

# Import your custom messages
from robot_interfaces.msg import SpectrometerData, StringArray
from rclpy.qos import QoSProfile, QoSDurabilityPolicy

class MockFileServer(Node):
    def __init__(self):
        super().__init__('mock_file_server')
        
        self.file_list_pub = self.create_publisher(StringArray, '/base_station/spectro_graph_list', 10)
        

        self.load_request_sub = self.create_subscription(
            StringArray,
            '/base_station/spectro_graph_gen',
            self.handle_load_request,
            10
        )
        
   
        qos_profile = QoSProfile(
            depth=10,
            durability=QoSDurabilityPolicy.TRANSIENT_LOCAL
        )
        self.data_pub = self.create_publisher(SpectrometerData, '/spectrometer/result', qos_profile)
        
        self.timer = self.create_timer(2.0, self.publish_file_list)
        self.get_logger().info("Mock File Server is running. Waiting for GUI requests...")

    def publish_file_list(self):
        """Sends fake file names to the GUI checkbox list"""
        msg = StringArray()
        msg.data = [
            "simulated_rock_sample.csv", 
            "simulated_soil_sample.csv",
            "basalt_spectroscopy_01.csv",
            "quartz_anomaly_detect.csv",
            "hematite_reference.csv",
            "meteorite_fragment_alpha.csv",
            "clay_mineral_test.csv",
            "uv_spectrometry_log_04.csv",
            "saline_soil_sample_B.csv",
            "iron_oxide_reading_7.csv",
            "background_noise_calibration.csv",
            "calibrated_regolith_scan.csv"
        ]
        self.file_list_pub.publish(msg)

    def handle_load_request(self, msg):
        """Triggered when you click the button in React"""
        requested_files = msg.data
        self.get_logger().info(f"GUI requested data for files: {requested_files}")
        
        if len(requested_files) > 0:
            self.publish_fake_data()

    def publish_fake_data(self):
        """Generates a bell curve and sends it to Recharts"""
        msg = SpectrometerData()
        msg.is_successful = True
        
        wavelengths = []
        intensities = []
        
        for i in range(400, 801):
            wavelengths.append(float(i))
            peak_center = 600.0
            width = 25.0
            base_intensity = math.exp(-((i - peak_center) ** 2) / (2 * width ** 2))
            noise = random.uniform(0.0, 0.08)
            
            intensities.append(base_intensity + noise)
            
        msg.wavelengths = wavelengths
        msg.intensities = intensities
        
        self.data_pub.publish(msg)
        self.get_logger().info("Published graph data to Recharts!")

def main(args=None):
    rclpy.init(args=args)
    node = MockFileServer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()