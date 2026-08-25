import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

const publishEmpty = (topicName) => {
    const topic = new ROSLIB.Topic({
        ros,
        name: topicName,
        messageType: 'std_msgs/msg/Empty',
    });
    topic.publish(new ROSLIB.Message({}));
};

const publishFloat = (topicName, value) => {
    const topic = new ROSLIB.Topic({
        ros,
        name: topicName,
        messageType: 'std_msgs/msg/Float32',
    });
    topic.publish(new ROSLIB.Message({ data: value }));
};

const HomingControl = ({ title, startTopic, stopTopic, zeroTopic, namespace, showArmZero }) => {
    const [homingState, setHomingState] = useState('idle');
    const [armZeroed, setArmZeroed] = useState(false);

    const startHoming = () => {
        publishFloat(zeroTopic, 0.0);   // auto-zero rail before starting
        publishEmpty(`/${namespace}/disable_rail_soft_limits`);  // disable soft limits
        publishEmpty(startTopic);
        setHomingState('homing');
    };

    const stopHoming = () => {
        publishEmpty(stopTopic);
        publishEmpty(`/${namespace}/enable_rail_soft_limits`);   // re-enable on manual stop
        setHomingState('idle');
    };

    

    const moveToCenter = () => publishEmpty(`/${namespace}/center_linear_rail`);

    const zeroArm = () => {
        publishEmpty(`/${namespace}/zero_arm_motors`);
        setArmZeroed(true);
        setTimeout(() => setArmZeroed(false), 2000);
    };

    const styles = {
        container: {
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            color: 'var(--text-primary, white)',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            marginBottom: '6px',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '14px',
            borderBottom: '1px solid #555',
            paddingBottom: '4px',
            marginBottom: '8px',
        },
        statusDot: {
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor:
                homingState === 'homed'  ? '#00cc44' :
                homingState === 'homing' ? '#ffaa00' : '#555',
            display: 'inline-block',
            marginRight: '6px',
        },
        statusText: {
            fontSize: '12px',
            color:
                homingState === 'homed'  ? '#00cc44' :
                homingState === 'homing' ? '#ffaa00' : '#888',
        },
        buttonRow: {
            display: 'flex',
            gap: '6px',
            marginBottom: '6px',
        },
        startBtn: {
            flex: 1, padding: '5px',
            backgroundColor: homingState === 'homing' ? '#444' : '#0066cc',
            color: 'white', border: 'none', borderRadius: '4px',
            cursor: homingState === 'homing' ? 'not-allowed' : 'pointer',
            fontSize: '13px',
        },
        stopBtn: {
            flex: 1, padding: '5px',
            backgroundColor: homingState === 'homing' ? '#cc0000' : '#444',
            color: 'white', border: 'none', borderRadius: '4px',
            cursor: homingState === 'homing' ? 'pointer' : 'not-allowed',
            fontSize: '13px',
        },
        btn: {
            width: '100%', padding: '5px',
            color: 'white', border: 'none', borderRadius: '4px',
            cursor: 'pointer', fontSize: '12px',
            marginBottom: '4px',
            transition: 'background-color 0.3s ease',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>{title}</span>
                <span style={styles.statusText}>
                    <span style={styles.statusDot} />
                    {homingState === 'homed'  ? 'Homed' :
                     homingState === 'homing' ? 'Homing...' : 'Not Homed'}
                </span>
            </div>
            <div style={styles.buttonRow}>
                <button style={styles.startBtn} onClick={startHoming} disabled={homingState === 'homing'}>
                    Start
                </button>
                <button style={styles.stopBtn} onClick={stopHoming} disabled={homingState !== 'homing'}>
                    Stop
                </button>
            </div>
            <button style={{ ...styles.btn, backgroundColor: '#445566' }} onClick={moveToCenter}>
                Move to Center
            </button>
            {showArmZero && (
                <button
                    style={{ ...styles.btn, backgroundColor: armZeroed ? '#336600' : '#446600' }}
                    onClick={zeroArm}
                >
                    {armZeroed ? '✓ Arm Zeroed' : 'Zero Arm Motors'}
                </button>
            )}
        </div>
    );
};

const RailHoming = () => {
    const [railCentered, setRailCentered] = useState(null);

    useEffect(() => {
        const topics = ['/manipulator/rail_centered', '/science_manipulator/rail_centered'];
        const subs = topics.map(name => {
            const sub = new ROSLIB.Topic({ ros, name, messageType: 'std_msgs/msg/Bool' });
            sub.subscribe((msg) => setRailCentered(msg.data));
            return sub;
        });
        return () => subs.forEach(s => s.unsubscribe());
    }, []);

    const bannerColor      = railCentered === null ? '#333'    : railCentered ? '#14532d' : '#7f1d1d';
    const bannerBorder     = railCentered === null ? '#555'    : railCentered ? '#16a34a' : '#b91c1c';
    const dotColor         = railCentered === null ? '#555'    : railCentered ? '#4ade80' : '#f87171';
    const bannerText       = railCentered === null ? 'Checking...'
                           : railCentered          ? '✓ Rail at center — homing not required'
                           :                         '⚠ Rail not centered — homing required';

    return (
        <div style={{
            backgroundColor: 'var(--bg-panel, #2a2a2a)',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            fontFamily: 'sans-serif',
        }}>
            <div style={{
                fontWeight: 'bold', fontSize: '14px',
                color: 'var(--text-primary, white)',
                borderBottom: '1px solid #555',
                paddingBottom: '4px', marginBottom: '8px',
            }}>
                Rail Homing
            </div>

            {/* Centered status banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 4, marginBottom: 8,
                backgroundColor: bannerColor,
                border: `1px solid ${bannerBorder}`,
            }}>
                <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    flexShrink: 0, backgroundColor: dotColor,
                }} />
                <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>
                    {bannerText}
                </span>
            </div>

            <HomingControl
                title="ES Arm Rail"
                startTopic="/manipulator/home_linear_rail"
                stopTopic="/manipulator/stop_home_linear_rail"
                zeroTopic="/manipulator/zero_rail_pos"
                namespace="manipulator"
                showArmZero={true}
            />
            <HomingControl
                title="Science Arm Rail"
                startTopic="/science_manipulator/home_linear_rail"
                stopTopic="/science_manipulator/stop_home_linear_rail"
                zeroTopic="/science_manipulator/zero_rail_pos"
                namespace="science_manipulator"
                showArmZero={true}
            />
        </div>
    );
};

export default RailHoming;