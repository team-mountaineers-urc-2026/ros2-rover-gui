import React, { useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090',
});

const Motor = ({ motorTopicPath, label, jointName, jointPosTopic }) => {
    const [dataType1, setDataType1] = useState({
        motorTemperatureC: 0.0,
        voltageVolts: 0.0,
        errorStatus: 0.0,
    });

    const [dataType2, setDataType2] = useState({
        currentAmps: 0.0,
        speedDps: 0.0,
    });

    const [position, setPosition] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [countdown, setCountdown] = useState(null);

    const countdownTimerRef = useRef(null);

    const status1Topic = `${motorTopicPath}/rcvd/status1`;
    const status2Topic = `${motorTopicPath}/rcvd/status2`;
    const resetTopic = `${motorTopicPath}/send/reset`;

    const handleResetButtonClick = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }

        const resetPub = new ROSLIB.Topic({
            ros,
            name: resetTopic,
            messageType: 'controls_msgs/msg/SystemResetMsgSentParams',
        });

        resetPub.publish(new ROSLIB.Message({}));
        setIsClicked(true);
        setCountdown(1);
        setIsHovered(false);

        countdownTimerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev === 1) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    setIsClicked(false);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        ros.on('error', (err) => console.error("ROS connection error:", err));
        ros.on('connection', () => console.log("Connected to ROS WebSocket"));
        ros.on('close', () => console.warn("ROS WebSocket connection closed."));

        const topic1Sub = new ROSLIB.Topic({
            ros,
            name: status1Topic,
            messageType: 'controls_msgs/msg/ReadMotorStatus1MsgRecvParams',
        });

        const topic2Sub = new ROSLIB.Topic({
            ros,
            name: status2Topic,
            messageType: 'controls_msgs/msg/ReadMotorStatus2MsgRecvParams',
        });

        topic1Sub.subscribe((message) => {
            setDataType1({
                motorTemperatureC: message.motor_temperature_c,
                voltageVolts: message.voltage_volts,
                errorStatus: message.error_status,
            });
        });

        topic2Sub.subscribe((message) => {
            setDataType2({
                currentAmps: message.current_amps,
                speedDps: message.speed_dps,
            });
        });

        let jointPosSub = null;
        if (jointName && jointPosTopic) {
            jointPosSub = new ROSLIB.Topic({
                ros,
                name: jointPosTopic,
                messageType: 'sensor_msgs/msg/JointState',
            });

            jointPosSub.subscribe((message) => {
                const idx = message.name.indexOf(jointName);
                if (idx !== -1) {
                    setPosition(message.position[idx]);
                }
            });
        }

        return () => {
            topic1Sub.unsubscribe();
            topic2Sub.unsubscribe();
            if (jointPosSub) jointPosSub.unsubscribe();
        };
    }, [status1Topic, status2Topic, jointName, jointPosTopic]);

    const formatPosition = () => {
        if (position === null) return 'N/A';
        // linear rail is in meters, others in degrees
        if (jointName === 'linear_rail') return `${position.toFixed(3)}m`;
        return `${position.toFixed(1)}°`;
    };

    const styles = {
        container: {
            backgroundColor: isClicked ? '#8b0000' : 'var(--bg-panel, #2a2a2a)',
            border: '1px solid var(--border, #444)',
            display: 'flex',
            color: 'var(--text-primary, white)',
            flexDirection: 'column',
            fontSize: '12pt',
            width: '8%',
            padding: '10px',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
            borderRadius: '4px',
        },
        label: {
            fontSize: '16pt',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '4px',
            borderBottom: '1px solid #555',
            paddingBottom: '3px',
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            margin: '1px 0',
        },
        key: {
            color: '#aaa',
            fontSize: '12pt',
        },
        val: {
            color: 'white',
            fontWeight: 'bold',
        },
        button: {
            backgroundColor: isHovered ? '#b00000' : '#cc0000',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12pt',
            padding: '3px 0',
            width: '100%',
            marginTop: '5px',
            borderRadius: '3px',
            transition: 'background-color 0.2s ease',
        },
    };

    return (
        <div style={styles.container}>
            {label && <div style={styles.label}>{label}</div>}

            {countdown !== null ? (
                <div style={{ textAlign: 'center', padding: '8px 0', color: '#ff9900' }}>
                    Resetting...
                </div>
            ) : (
                <>
                    <div style={styles.row}>
                        <span style={styles.key}>volts</span>
                        <span style={styles.val}>{dataType1.voltageVolts.toFixed(1)}V</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.key}>amps</span>
                        <span style={styles.val}>{dataType2.currentAmps.toFixed(1)}A</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.key}>temp</span>
                        <span style={styles.val}>{dataType1.motorTemperatureC.toFixed(1)}°C</span>
                    </div>
                    {jointName && (
                        <div style={styles.row}>
                            <span style={styles.key}>pos</span>
                            <span style={styles.val}>{formatPosition()}</span>
                        </div>
                    )}
                </>
            )}

            {countdown === null && (
                <button
                    style={styles.button}
                    onClick={handleResetButtonClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    RESET
                </button>
            )}
        </div>
    );
};

export default Motor;