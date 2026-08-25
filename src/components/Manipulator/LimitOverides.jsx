import React, { useState } from 'react';
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

const publishString = (topicName, data) => {
    const topic = new ROSLIB.Topic({
        ros,
        name: topicName,
        messageType: 'std_msgs/msg/String',
    });
    topic.publish(new ROSLIB.Message({ data }));
};

const ToggleRow = ({ label, enabled, onEnable, onDisable, warning }) => {
    const styles = {
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
            borderBottom: '1px solid #333',
        },
        label: {
            fontSize: '13pt',
            color: 'var(--text-primary, white)',
            flex: 1,
        },
        status: {
            fontSize: '16px',
            color: enabled ? '#00cc44' : '#cc4400',
            marginRight: '8px',
            minWidth: '45px',
            textAlign: 'right',
        },
        btnGroup: {
            display: 'flex',
            gap: '4px',
        },
        enableBtn: {
            padding: '3px 8px',
            backgroundColor: enabled ? '#555' : '#006600',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: enabled ? 'not-allowed' : 'pointer',
            fontSize: '16px',
        },
        disableBtn: {
            padding: '3px 8px',
            backgroundColor: !enabled ? '#555' : '#880000',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: !enabled ? 'not-allowed' : 'pointer',
            fontSize: '16px',
        },
    };

    return (
        <div style={styles.row}>
            <span style={styles.label}>{label}</span>
            <span style={styles.status}>{enabled ? 'ON' : 'OFF'}</span>
            <div style={styles.btnGroup}>
                <button style={styles.enableBtn} onClick={onEnable} disabled={enabled}>
                    Enable
                </button>
                <button style={styles.disableBtn} onClick={onDisable} disabled={!enabled}>
                    Disable
                </button>
            </div>
        </div>
    );
};

const ArmOverrides = ({ title, namespace }) => {
    const [softLimits, setSoftLimits] = useState(true);
    const [railProtection, setRailProtection] = useState(true);
    const [allProtection, setAllProtection] = useState(true);

    return (
        <div style={{
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '6px',
        }}>
            <div style={{
                fontWeight: 'bold',
                fontSize: '16pt',
                color: 'var(--text-primary, white)',
                borderBottom: '1px solid #555',
                paddingBottom: '4px',
                marginBottom: '6px',
            }}>
                {title}
            </div>

            <ToggleRow
                label="Soft Limits"
                enabled={softLimits}
                onEnable={() => {
                    publishEmpty(`/${namespace}/enable_rail_soft_limits`);
                    setSoftLimits(true);
                }}
                onDisable={() => {
                    publishEmpty(`/${namespace}/disable_rail_soft_limits`);
                    setSoftLimits(false);
                }}
            />

            <ToggleRow
                label="Rail Protection"
                enabled={railProtection}
                onEnable={() => {
                    publishString(`/${namespace}/enable_protection`, 'linear_rail');
                    setRailProtection(true);
                }}
                onDisable={() => {
                    publishString(`/${namespace}/disable_protection`, 'linear_rail');
                    setRailProtection(false);
                }}
            />

            <ToggleRow
                label="All Motor Protection"
                enabled={allProtection}
                onEnable={() => {
                    publishString(`/${namespace}/enable_protection`, 'all');
                    setAllProtection(true);
                }}
                onDisable={() => {
                    publishString(`/${namespace}/disable_protection`, 'all');
                    setAllProtection(false);
                }}
            />
        </div>
    );
};

const LimitOverrides = () => {
    return (
        <div style={{
            backgroundColor: 'var(--bg-panel, #2a2a2a)',
            border: '1px solid #cc4400',  // orange border to signal danger
            borderRadius: '4px',
            padding: '8px',
            fontFamily: 'sans-serif',
        }}>
            <div style={{
                fontWeight: 'bold',
                fontSize: '18pt',
                color: '#cc4400',
                borderBottom: '1px solid #555',
                paddingBottom: '4px',
                marginBottom: '8px',
            }}>
                ⚠ Limit Overrides
            </div>

            <ArmOverrides title="ES Arm" namespace="manipulator" />
            <ArmOverrides title="Science Arm" namespace="science_manipulator" />
        </div>
    );
};

export default LimitOverrides;