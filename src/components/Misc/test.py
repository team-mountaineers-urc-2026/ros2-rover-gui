from rclpy.node import Node
from std_msgs.msg import Float32
from geometry_msgs.msg import Vector3
from nav_msgs.msg import Odometry
import rclpy
import random
import time

class TestNode(Node):
    def __init__(self):
        super().__init__('bell_curve_publisher')

        self.pub_topic1 = self.create_publisher(Float32, '/topic1', 10)
        self.pub_topic2 = self.create_publisher(Vector3, '/topic2', 10)
        self.pub_topic3 = self.create_publisher(Odometry, '/topic3', 10)
        
        self.pub_topic4 = self.create_publisher(Float32, '/topic4', 10)
        self.pub_topic5 = self.create_publisher(Float32, '/topic5', 10)
        self.pub_topic6 = self.create_publisher(Float32, '/topic6', 10)
        
        self.pub_topic7 = self.create_publisher(Float32, '/topic7', 10)
        self.pub_topic8 = self.create_publisher(Float32, '/topic8', 10)
        self.pub_topic9 = self.create_publisher(Float32, '/topic9', 10)
        self.pub_topic10 = self.create_publisher(Float32, '/topic10', 10)
        self.pub_topic11 = self.create_publisher(Float32, '/topic11', 10)
        self.pub_topic12 = self.create_publisher(Float32, '/topic12', 10)

        self.publish_enabled = True

        self.create_timer(0.05, self.pub_topics)

        self.create_timer(2.0, self.toggle_publish)

    def pub_topics(self):
        if self.publish_enabled:
            self.pub_top1()
            self.pub_top2()
            self.pub_top3()
            self.pub_top4()
            self.pub_top5()
            self.pub_top6()
            self.pub_top7()
            self.pub_top8()
            self.pub_top9()
            self.pub_top10()
            self.pub_top11()
            self.pub_top12()

    def pub_top1(self):
        value = random.gauss(50, 20)
        self.pub_topic1.publish(Float32(data=value))

    def pub_top2(self):
        value = random.gauss(70, 20)
        self.pub_topic2.publish(Vector3(x=value))

    def pub_top3(self):
        value = random.gauss(90, 20)
        odom = Odometry()
        odom.pose.pose.orientation.x = value
        self.pub_topic3.publish(odom)
        
    def pub_top4(self):
        value = random.gauss(110, 20)
        self.pub_topic4.publish(Float32(data=value))
        
    def pub_top5(self):
        value = random.gauss(130, 20)
        self.pub_topic5.publish(Float32(data=value))
        
    def pub_top6(self):
        value = random.gauss(150, 20)
        self.pub_topic6.publish(Float32(data=value))

    def pub_top7(self):
        value = random.gauss(170, 20)
        self.pub_topic7.publish(Float32(data=value))

    def pub_top8(self):
        value = random.gauss(190, 20)
        self.pub_topic8.publish(Float32(data=value))

    def pub_top9(self):
        value = random.gauss(210, 20)
        self.pub_topic9.publish(Float32(data=value))

    def pub_top10(self):
        value = random.gauss(230, 20)
        self.pub_topic10.publish(Float32(data=value))

    def pub_top11(self):
        value = random.gauss(250, 20)
        self.pub_topic11.publish(Float32(data=value))

    def pub_top12(self):
        value = random.gauss(270, 20)
        self.pub_topic12.publish(Float32(data=value))

    def toggle_publish(self):
        self.publish_enabled = random.choice([True, False])
        if self.publish_enabled:
            self.get_logger().info("Publishing continuing")
        else:
            self.get_logger().info("Publishing stopped")

def main(args=None):
    rclpy.init(args=args)
    node = TestNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info('Shutting down node.')
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
