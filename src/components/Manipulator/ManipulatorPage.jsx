import React, { useState } from 'react';
import MotorGrid from '../Misc/MotorGrid';
import RailHoming from './RailHoming';
import LimitOverrides from './LimitOverides';
import BatteryMonitor from './MotorAmpMonitor';
import CommsMonitor from './CommsMonitor';
import MissionTimer from './MissionTimer';


const drivebaseMotors = [
    { label: "Front L",  motorTopicPath: "/drivetrain/front_left"  },
    { label: "Front R",  motorTopicPath: "/drivetrain/front_right" },
    { label: "Back L",   motorTopicPath: "/drivetrain/back_left"   },
    { label: "Back R",   motorTopicPath: "/drivetrain/back_right"  },
];

const armMotors_ES = [
    { label: "Rail",     motorTopicPath: "/manipulator/linear_rail",  jointName: "linear_rail", jointPosTopic: "/manipulator/joint_pos" },
    { label: "Shoulder", motorTopicPath: "/manipulator/shoulder",     jointName: "shoulder",    jointPosTopic: "/manipulator/joint_pos" },
    { label: "Elbow",    motorTopicPath: "/manipulator/elbow",        jointName: "elbow",       jointPosTopic: "/manipulator/joint_pos" },
    { label: "Pitch",    motorTopicPath: "/manipulator/wrist_pitch",  jointName: "wrist_pitch", jointPosTopic: "/manipulator/joint_pos" },
    { label: "Roll",     motorTopicPath: "/manipulator/wrist_roll",   jointName: "wrist_roll",  jointPosTopic: "/manipulator/joint_pos" },
    { label: "Gripper",  motorTopicPath: "/manipulator/gripper",      jointName: "gripper",     jointPosTopic: "/manipulator/joint_pos" },
];

const armMotors_Science = [
    { label: "Rail",     motorTopicPath: "/science_manipulator/linear_rail",  jointName: "linear_rail", jointPosTopic: "/science_manipulator/joint_pos" },
    { label: "Shoulder", motorTopicPath: "/science_manipulator/shoulder",     jointName: "shoulder",    jointPosTopic: "/science_manipulator/joint_pos" },
    { label: "Elbow",    motorTopicPath: "/science_manipulator/elbow",        jointName: "elbow",       jointPosTopic: "/science_manipulator/joint_pos" },
    { label: "Drum",     motorTopicPath: "/science_manipulator/wrist_pitch",  jointName: "wrist_pitch", jointPosTopic: "/science_manipulator/joint_pos" },
];

const ManipulatorPage = () => {
    const [vizCollapsed, setVizCollapsed] = useState(true);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: '10px',
            padding: '8px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            color: 'var(--text-primary, white)',
        }}>

        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                width: '100%',
                height: '35% ',
                gap: '3%',
                justifyContent: 'center',
            }}
        >
            {/* LEFT */}
            <div style={{ flex: '0 0 15%' }}>
                <RailHoming />
            </div>
            <div style={{ flex: '0 0 15%'}}>
                <BatteryMonitor />
            </div>
            <div style={{ flex: '0 0 15%' }}>
                 <CommsMonitor title='5.8 GHz Comms Link' frequencyFilter={58} />
            </div>
             <div style={{ flex: '0 0 15%' }}>
                 <CommsMonitor frequencyFilter={24} />
            </div>
            {/* RIGHT */}
            <div style={{ flex: '0 0 20%' }}>
                <LimitOverrides />
            </div>
            
        </div>

            {/* Middle Row: Left column (MOTOR GRIDS) | Right column (COMMS DATA) */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '10px',
                    alignItems: 'flex-start',
                    width: '100%',
                }}
            >
                {/* LEFT SIDE — takes remaining width */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <MotorGrid title="ES Arm Motors" motors={armMotors_ES} />
                    <MotorGrid title="Science Arm Motors" motors={armMotors_Science} />
                    <MotorGrid title="Drive Motors" motors={drivebaseMotors} />
                </div>
            </div>


            {/* Collapsible Visualizer at bottom */}
            <div style={{
                flexShrink: 0,
                border: '1px solid #444',
                borderRadius: '4px',
                overflow: 'hidden',
            }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: 'var(--header-bg, #333)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={() => setVizCollapsed(c => !c)}
                >
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Arm Visualizer</span>
                    <button style={{
                        fontSize: '12px',
                        padding: '2px 6px',
                        backgroundColor: '#555',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}>
                        {vizCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                </div>
                {!vizCollapsed && (
                    <div style={{ height: '400px' }}>
                        <iframe
                            src="http://localhost:7000"
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Robot Simulation"
                        />
                    </div>
                )}
            </div>

        </div>
    );
};

export default ManipulatorPage;