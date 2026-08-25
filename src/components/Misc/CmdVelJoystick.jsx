import React, { useEffect, useRef, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090',
});

const CmdVelJoystick = ({ timerDelay, topicPath, size}) => {
    const publishRateHz = 10;

    if (!timerDelay) {
        throw new Error("The 'timerDelay' prop is required for CmdVelJoystick.");
    }
    if (!topicPath) {
        throw new Error("The 'topicPath' prop is required for CmdVelJoystick.");
    }

    const cmdVel = new ROSLIB.Topic({
        ros,
        name: topicPath,
        messageType: 'geometry_msgs/Twist',
    });

    const [isJoystickEnabled, setIsJoystickEnabled] = useState(false);
    const [holdStartTime, setHoldStartTime] = useState(null);
    const [remainingTime, setRemainingTime] = useState(timerDelay / 1000);
    const [timerActive, setTimerActive] = useState(false);
    const [isTimerExpired, setIsTimerExpired] = useState(false);
    const [isJoystickActive, setIsJoystickActive] = useState(false);

    const lastJoystickState = useRef({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
    });

    useEffect(() => {
        ros.on('connection', () => {
            console.log('Connected to ROS!');
        });

        ros.on('error', (error) => {
            console.error('Connection error:', error);
        });

        ros.on('close', () => {
            console.log('Connection closed');
        });

        return () => {
            // ros.close();
            console.log('ROS connection closed');
        };
    }, []);

    useEffect(() => {
        if (timerActive && holdStartTime) {
            const interval = setInterval(() => {
                const elapsedTime = Date.now() - holdStartTime;
                const newRemainingTime = Math.max(0, (timerDelay - elapsedTime) / 1000);
                setRemainingTime(newRemainingTime);

                if (elapsedTime >= timerDelay) {
                    clearInterval(interval);
                    setIsJoystickEnabled(true);
                    setIsTimerExpired(true);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [timerActive, holdStartTime, timerDelay]);

    useEffect(() => {
        const publishInterval = setInterval(() => {
            if (isJoystickActive) {
                cmdVel.publish(new ROSLIB.Message(lastJoystickState.current));
            }
        }, 1000 / publishRateHz);

        return () => clearInterval(publishInterval);
    }, [isJoystickActive]);

    const handleHoldStart = () => {
        setHoldStartTime(Date.now());
        setRemainingTime(timerDelay / 1000);
        setTimerActive(true);
        setIsTimerExpired(false);
    };

    const handleHoldEnd = () => {
        if (!isTimerExpired) {
            setRemainingTime(timerDelay / 1000);
            setTimerActive(false);
        }
    };

    const handleMove = (data) => {
        if (!isJoystickEnabled) return;

        const x = data.x;
        const y = data.y;

        let yaw = -1 * Math.atan2(x, y);
        const distance = Math.sqrt(x ** 2 + y ** 2);

        if (Math.abs(yaw) <= 0.1) {
            yaw = 0.0;
        }

        lastJoystickState.current = {
            linear: { x: distance, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: yaw },
        };

        setIsJoystickActive(true);
    };

    const handleStop = () => {
        if (!isJoystickEnabled) return;

        const zeroMessage = {
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        };

        cmdVel.publish(new ROSLIB.Message(zeroMessage));
        lastJoystickState.current = zeroMessage;

        setIsJoystickActive(false);
    };

    const remainingTimeText = isJoystickEnabled
        ? ''
        : `press and hold for ${remainingTime.toFixed(1)}s for backup drivetrain controls`;

    const styles = {
        joystickContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            padding: '20px',
            backgroundColor: '#dfd2ff',
            borderRadius: '20px',
            color: 'white',
            textAlign: 'center',
            overflow: 'hidden',
            color: 'black',
            fontSize: '16px',
            wordWrap: 'break-word',
        },
    };

    return (
        <div style={styles.joystickContainer}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}> 
        
                {isJoystickEnabled ? (
                    <Joystick
                        size={parseInt(size, 10)*0.75}
                        move={handleMove}
                        stop={handleStop}
                        baseColor='#756899'
                        stickColor='#8D7FB3'
                        stickSize={parseInt(size, 10)*0.5}
                    />
                ) : null}
            <div style={{ userSelect: 'none',cursor: 'pointer'}}>{remainingTimeText}</div>
        </div>
    );
};

export default CmdVelJoystick;
