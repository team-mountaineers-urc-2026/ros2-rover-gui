import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

const RailPositionDisplay = ({ namespace = 'manipulator' }) => {
    const [currentPos, setCurrentPos] = useState(null);

    useEffect(() => {
        const topic = new ROSLIB.Topic({
            ros,
            name: `/${namespace}/joint_pos`,
            messageType: 'sensor_msgs/msg/JointState',
        });

        topic.subscribe((msg) => {
            const idx = msg.name.indexOf('linear_rail');
            if (idx !== -1) {
                setCurrentPos(msg.position[idx]);
            }
        });

        return () => topic.unsubscribe();
    }, [namespace]);

    // These come from your zeros.yaml homing data
    // Hard limits from your last homing run
    const leftHardLimit  =  0.003;
    const rightHardLimit = -0.161;

    const totalRange = Math.abs(leftHardLimit - rightHardLimit);
    const pct = currentPos !== null
        ? Math.max(0, Math.min(100, ((currentPos - rightHardLimit) / totalRange) * 100))
        : null;

    const fmt = (v) => v !== null ? `${(v * 100).toFixed(1)} ` : '—';

    const styles = {
        container: {
            backgroundColor: 'var(--bg-panel, #2a2a2a)',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px 10px',
            fontSize: '12px',
            color: 'var(--text-primary, white)',
            fontFamily: 'sans-serif',
        },
        header: {
            fontWeight: 'bold',
            fontSize: '13px',
            borderBottom: '1px solid #555',
            paddingBottom: '4px',
            marginBottom: '8px',
            opacity: 0.85,
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
        },
        label: { opacity: 0.65 },
        value: { fontFamily: 'monospace', fontWeight: 'bold' },
        barOuter: {
            height: '6px',
            backgroundColor: '#333',
            borderRadius: '3px',
            marginTop: '8px',
            overflow: 'hidden',
        },
        barInner: {
            height: '100%',
            width: pct !== null ? `${pct}%` : '0%',
            backgroundColor: '#0066cc',
            borderRadius: '3px',
            transition: 'width 0.1s ease',
        },
        limits: {
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '3px',
            opacity: 0.5,
            fontSize: '10px',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>Linear Rail</div>
            <div style={styles.row}>
                <span style={styles.label}>Position</span>
                <span style={styles.value}>{fmt(currentPos)}</span>
            </div>
            <div style={styles.row}>
                <span style={styles.label}>Left Limit</span>
                <span style={styles.value}>{fmt(leftHardLimit)}</span>
            </div>
            <div style={styles.row}>
                <span style={styles.label}>Right Limit</span>
                <span style={styles.value}>{fmt(rightHardLimit)}</span>
            </div>
            <div style={styles.barOuter}>
                <div style={styles.barInner} />
            </div>
            <div style={styles.limits}>
                <span>R</span>
                <span>L</span>
            </div>
        </div>
    );
};

export default RailPositionDisplay;