import React from 'react';
import Motor from './Motor';

const MotorGrid = ({ title, motors }) => {
    const styles = {
        section: {
            marginBottom: '16px',
        },
        title: {
            fontSize: '20pt',
            fontWeight: 'bold',
            color: 'var(--text-primary, white)',
            marginBottom: '10px',
            borderBottom: '1px solid #555',
            paddingBottom: '10px',
        },
        grid: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2%',
        },
    };

    return (
        <div style={styles.section}>
            {title && <div style={styles.title}>{title}</div>}
            <div style={styles.grid}>
                {motors.map((m) => (
                    <Motor
                        key={m.motorTopicPath}
                        motorTopicPath={m.motorTopicPath}
                        label={m.label}
                        jointName={m.jointName}
                        jointPosTopic={m.jointPosTopic}
                    />
                ))}
            </div>
        </div>
    );
};

export default MotorGrid;