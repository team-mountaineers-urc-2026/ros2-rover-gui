import React, { useRef, useState } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090',
});

const ResetMotor = ({ motorTopicPath, label }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [countdown, setCountdown] = useState(null);

    const countdownTimerRef = useRef(null);

    const resetTopic = `${motorTopicPath}/send/reset`;

    const resetPub = new ROSLIB.Topic({
        ros: ros,
        name: resetTopic,
        messageType: 'controls_msgs/msg/SystemResetMsgSentParams',
    });

    const handleResetButtonClick = () => {
        console.log('Reset ' + label + ' button clicked towards ' + resetTopic);
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }

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

    const styles = {
        container: {
            backgroundColor: isClicked ? 'red' : 'gray',
            display: 'flex',
            color: 'white',
            flexDirection: 'column',
            fontSize: '16px',
            width: '80px',
            height: '80px',
            justifyContent: 'flex-start',
            alignItems: 'center',
            fontFamily: 'sans-serif',
        },
        label: {
            marginTop: '4px',
            // fontSize: '16px',
            fontFamily: 'sans-serif',
        },
        value: {
            margin: '2px',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            // fontSize: '16px',
        },
        content: {
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
        },
        button: {
            backgroundColor: isHovered ? '#b00000' : '#ff0000',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            // fontSize: '16px',
            height: '20px',
            // width: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
            transition: 'background-color 0.3s ease',
            fontFamily: 'sans-serif',
        },
    };

    return (
        <div style={styles.container}>
            {label && <div style={styles.label}>{label}</div>}

            <div style={styles.content}>
                {countdown !== null ? (<div style={styles.value}>resetting</div>) : (<div></div>)}

            {countdown === null && (
                <button style={styles.button} 
                onClick={handleResetButtonClick} 
                onMouseEnter={() => setIsHovered(true)} 
                onMouseLeave={() => setIsHovered(false)}> reset </button>
            )}
        </div>
        </div>

    );
};

export default ResetMotor;
