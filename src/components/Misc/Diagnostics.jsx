import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090',
});

const Diagnostics = () => {
  const [cpuUsage, setCpuUsage] = useState(0.0);
  const [memoryUsage, setMemoryUsage] = useState(0.0);
  const [diskUsage, setDiskUsage] = useState(0.0);
  const [networkUsage, setNetworkUsage] = useState({ rx: 0.0, tx: 0.0 });
  const [pingRTT, setPingRTT] = useState(0.0);
  const [signalStrength, setSignalStrength] = useState({ base: 0.0, rover: 0.0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    ros.on('connection', () => {
      console.log('Connected to ROS');
    });

    ros.on('error', (error) => {
      console.error('Error in ROS connection:', error);
      setError('ROS connection error');
    });

    ros.on('close', () => {
      console.log('Connection closed');
    });

    const topics = [
      {
        name: '/cpu_usage',        // Start a new countdown timer
        messageType: 'std_msgs/msg/Float32',
        callback: (message) => setCpuUsage(message.data),
      },
      {
        name: '/memory_usage',
        messageType: 'std_msgs/msg/Float32',
        callback: (message) => setMemoryUsage(message.data),
      },
      {
        name: '/disk_usage',
        messageType: 'std_msgs/msg/Float32',
        callback: (message) => setDiskUsage(message.data),
      },
      {
        name: '/network_usage',
        messageType: 'geometry_msgs/msg/Vector3',
        callback: (message) => setNetworkUsage({ rx: message.x, tx: message.y }),
      },
      {
        name: '/ping_rtt',
        messageType: 'std_msgs/msg/Float32',
        callback: (message) => setPingRTT(message.data),
      },
      {
        name: '/signal_strength',
        messageType: 'geometry_msgs/msg/Vector3',
        callback: (message) =>
          setSignalStrength({ base: message.x, rover: message.y }),
      },
    ];

    const subscribers = topics.map((topic) => {
      const rosTopic = new ROSLIB.Topic({
        ros,
        name: topic.name,
        messageType: topic.messageType,
      });
      rosTopic.subscribe(topic.callback);
      return rosTopic;
    });

    return () => {
      subscribers.forEach((subscriber) => subscriber.unsubscribe());
    };
  }, []);

  const styles = {
    label: {
      fontSize: '14px',
      marginBottom: '2px',
      fontWeight: 'bold',
    },
    box: {
      backgroundColor: 'gray',
      color: 'white',
      padding: '2px',
      fontFamily: 'sans-serif',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2px',
    },
    text: {
      fontSize: '16px',
    },
  };

  return (
    <div style={styles.box}>
      <div style={styles.label}>Rover Diagnostics</div>
      <div>
        <div style={styles.row}>
          <span>CPU Usage:</span>
          <span>{cpuUsage.toFixed(2)}%</span>
        </div>
        <div style={styles.row}>
          <span>Memory Usage:</span>
          <span>{memoryUsage.toFixed(2)}%</span>
        </div>
        <div style={styles.row}>
          <span>Disk Usage:</span>
          <span>{diskUsage.toFixed(2)}%</span>
        </div>
        <div style={styles.row}>
          <span>Network RX:</span>
          <span>{networkUsage.rx.toFixed(2)} Mbps</span>
        </div>
        <div style={styles.row}>
          <span>Network TX:</span>
          <span>{networkUsage.tx.toFixed(2)} Mbps</span>
        </div>
        <div style={styles.row}>
          <span>Ping RTT:</span>
          <span>{pingRTT.toFixed(2)} ms</span>
        </div>
        <div style={styles.row}>
          <span>Signal Base:</span>
          <span>{signalStrength.base.toFixed(2)} dB</span>
        </div>
        <div style={styles.row}>
          <span>Signal Rover:</span>
          <span>{signalStrength.rover.toFixed(2)} dB</span>
        </div>
      </div>
    </div>
  );
};

export default Diagnostics;
