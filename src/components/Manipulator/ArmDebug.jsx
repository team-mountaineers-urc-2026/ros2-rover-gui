import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });

const currentStyle = (current, name) => {
  if (name === 'linear_rail') {
    if (current > 1.5) {
      return {
        color: 'red',
        fontWeight: 'bold',
        margin: '0'
      }
    }
  } else if (name === 'wrist_roll' || name === 'wrist_pitch') {
    if (current > 1.0) {
      return {
        color: 'red',
        fontWeight: 'bold',
        margin: '0'
      }
    }
  }
  else if (name === 'shoulder' || name === 'elbow') {
    if (current > 7.0) {
      return {
        color: 'red',
        fontWeight: 'bold',
        margin: '0'
      }
    }
  }

  return {
    color: 'black',
    fontWeight: 'normal',
    margin: '0'
  }
}

const phiStyle = (phi) => {
  var ret = {};
  if (phi < 50) {
    ret = {
      color: 'red',
      fontWeight: 'bold',
      margin: '0'
    }
  } else if (phi < 65) {
    ret = {
      color: 'goldenrod',
      fontWeight: 'bold',
      margin: '0'
    }
  } else {
    ret = {
      color: 'green',
      fontWeight: 'normal',
      margin: '0'
    }
  }
  return ret;
}

const ArmDebug = () => {
  useEffect(() => {
    ros.on('connection', () => {
      console.log('ArmDebug connected to ROS!');
    });

    ros.on('error', (error) => {
      console.error('ArmDebug: connection error:', error);
    });

    ros.on('close', () => {
      console.log('ArmDebug: connection closed');
    });

    return () => {
      // ros.close();
      console.log('ArmDebug: ROS connection closed');
    };
  }, []);

  /** COPIED FROM NOTES
  use name and position as key value pair
  name:
  - shoulder (units of deg) *-1
  - elbow (units of deg) *-1
  - wrist_pitch (deg straight)
  - wrist_roll (deg straight)
  - linear_rail (units of meters from motor/stop side)

  use elbow only in main area
  use elbow - shoulder in bottom or something
  */

  const [armState, setArmState] = useState({
    shoulder: 0,
    elbow: 0,
    wrist_pitch: 0,
    wrist_roll: 0,
    linear_rail: 0.0,
  });

  const [armCurrents, setArmCurrents] = useState({
    shoulder: 0,
    elbow: 0,
    wrist_roll: 0,
    wrist_pitch: 0,
    linear_rail: 0
  })

  // Update arm state
  const updateArmState = (joint, value) => {
    setArmState((prevState) => ({
      ...prevState,
      [joint]: value,
    }));
  };

  const updateCurrents = (joint, value) => {
    setArmCurrents((prevState) => ({
      ...prevState,
      [joint]: value,
    }));
  }

  useEffect(() => {
    const armDebugTopic = new ROSLIB.Topic({
      ros,
      name: '/manipulator/joint_pos',
      messageType: 'sensor_msgs/JointState',
    });

    armDebugTopic.subscribe((message) => {
      const jointNames = message.name;
      const jointPositions = message.position;
      const jointEfforts = message.effort;

      // Update arm state based on the received message
      jointNames.forEach((jointName, index) => {
        const jointValue = jointPositions[index];
        updateArmState(jointName, jointValue);

        if (jointEfforts && jointEfforts[index] !== undefined) {
          const jointCurrent = jointEfforts[index];
          updateCurrents(jointName, jointCurrent);
        }
      });
    });
  }, []);

  // Text-only debug of arm
  return (
    <div>
      <div style={styles.armDebug}>
        <p style={styles.armDebugHeading}>Arm Debug</p>
        <div style={styles.armElement}>
          <p style={{margin: '0'}}>Shoulder: {-1*Math.round(armState.shoulder)}° </p>
          <p style={currentStyle(armCurrents.shoulder, 'shoulder')}>{armCurrents.shoulder.toFixed(2)} A</p>
        </div>
        <div style={styles.armElement}>
          <p style={{margin: '0'}}>Elbow: {-1*Math.round(armState.elbow)}°</p>
          <p style={currentStyle(armCurrents.elbow, 'elbow')}>{armCurrents.elbow.toFixed(2)} A</p>
        </div>
        <div style={styles.armElement}>
          <p style={{margin: '0'}}>Wrist Pitch: {Math.round(armState.wrist_pitch)}°</p>
          <p style={currentStyle(armCurrents.wrist_pitch, 'wrist_pitch')}>{armCurrents.wrist_pitch.toFixed(2)} A</p>
        </div>
        <div style={styles.armElement}>
          <p style={{margin: '0'}}>Wrist Roll: {Math.round(armState.wrist_roll)}°</p>
          <p style={currentStyle(armCurrents.wrist_roll, 'wrist_roll')}>{armCurrents.wrist_roll.toFixed(2)} A</p>
        </div>
        <div style={styles.armElement}>
        <p style={{
            color: armState.linear_rail >= 0.36 || armState.linear_rail <= 0.06 ? "red" : "black",
            fontWeight: armState.linear_rail >= 0.36 || armState.linear_rail <= 0.06 ? "bold" : "normal",
            margin: '0'
          }}>Linear Rail: {armState.linear_rail.toFixed(3)} m</p>
          <p style={currentStyle(armCurrents.linear_rail, 'linear_rail')}>{armCurrents.linear_rail.toFixed(2)} A</p>
        </div>
        <p
        // TODO can this be a function plzzzzz? And simplified?
          style={phiStyle(180-Math.round(-armState.shoulder + 90 - armState.elbow))}>
          PHI: {180-Math.round(-armState.shoulder + 90 - armState.elbow)}°</p>
      </div>
    </div>
  );
}

const styles = {
  armDebug: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: 'black',
    padding: '1px 5px',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
  },
  armDebugHeading: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    marginBottom: '10px',
    marginTop: '0px',
  },
  armElement: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
}

export default ArmDebug;