import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { useAmps } from './AmpContext';

const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

const ES_MOTORS      = ['shoulder', 'elbow', 'wrist_pitch', 'wrist_roll', 'linear_rail', 'gripper'];
const SCIENCE_MOTORS = ['shoulder', 'elbow', 'wrist_pitch', 'linear_rail'];

const getBatteryLabel = (voltage) => {
    if (voltage >= 39.5) return { label: 'Almost Full', color: '#00cc44' };
    if (voltage >= 38.5) return { label: 'High',        color: '#66cc00' };
    if (voltage >= 37.0) return { label: 'Medium',      color: '#ffaa00' };
    if (voltage >= 36.1) return { label: 'Low',         color: '#ff6600' };
    return                      { label: 'Almost Empty', color: '#cc0000' };
};

const SidebarAmpsDisplay = () => {
    const { ahUsed, totalAh } = useAmps();
    const [amps, setAmps]         = useState({});
    const [avgVoltage, setAvgVoltage] = useState(null);

    const ahRemaining = Math.max(0, (totalAh ?? 8.0) - (ahUsed ?? 0));
    const totalAmps   = Object.values(amps).reduce((a, b) => a + Math.abs(b), 0);

    const ampColor =
        totalAmps > 6 ? '#cc0000' :
        totalAmps > 3 ? '#ffaa00' :
        '#00cc44';

    const batteryStatus = avgVoltage !== null ? getBatteryLabel(avgVoltage) : null;
    const statusColor   = batteryStatus ? batteryStatus.color : '#555';

    // status2 → amps
    useEffect(() => {
        const subs = [];

        ES_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/manipulator/${motor}/rcvd/status2`,
                messageType: 'controls_msgs/msg/ReadMotorStatus2MsgRecvParams',
            });
            sub.subscribe((msg) => {
                setAmps((prev) => ({ ...prev, [`es_${motor}`]: msg.current_amps ?? 0 }));
            });
            subs.push(sub);
        });

        SCIENCE_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/science_manipulator/${motor}/rcvd/status2`,
                messageType: 'controls_msgs/msg/ReadMotorStatus2MsgRecvParams',
            });
            sub.subscribe((msg) => {
                setAmps((prev) => ({ ...prev, [`sci_${motor}`]: msg.current_amps ?? 0 }));
            });
            subs.push(sub);
        });

        return () => subs.forEach((s) => s.unsubscribe());
    }, []);

    // status1 → voltage
    useEffect(() => {
        const voltages = {};
        const subs = [];

        ES_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/manipulator/${motor}/rcvd/status1`,
                messageType: 'controls_msgs/msg/ReadMotorStatus1MsgRecvParams',
            });

            sub.subscribe((msg) => {
                voltages[`es_${motor}`] = msg.voltage_volts;

                const vals = Object.values(voltages).filter(v => v > 0);

                if (vals.length > 0) {
                    setAvgVoltage(
                        vals.reduce((a, b) => a + b, 0) / vals.length
                    );
                }
            });

            subs.push(sub);
        });

        SCIENCE_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/science_manipulator/${motor}/rcvd/status1`,
                messageType: 'controls_msgs/msg/ReadMotorStatus1MsgRecvParams',
            });

            sub.subscribe((msg) => {
                voltages[`sci_${motor}`] = msg.voltage_volts;

                const vals = Object.values(voltages).filter(v => v > 0);

                if (vals.length > 0) {
                    setAvgVoltage(
                        vals.reduce((a, b) => a + b, 0) / vals.length
                    );
                }
            });

            subs.push(sub);
        });

        return () => subs.forEach(s => s.unsubscribe());
    }, []);

    return (
        <div style={{
            backgroundColor: 'var(--bg-panel, #2a2a2a)',
            border: `1px solid ${statusColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
            color: 'var(--text-primary, white)',
        }}>
            {/* Big status box */}
            <div style={{
                backgroundColor: statusColor + '22',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${statusColor}`,
            }}>
                <div style={{
                    fontSize: '11px',
                    color: '#aaa',
                    marginBottom: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Battery
                </div>
                <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: statusColor,
                }}>
                    {batteryStatus ? batteryStatus.label : 'No Data'}
                </div>
                {avgVoltage !== null && (
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                        {avgVoltage.toFixed(1)} V
                    </div>
                )}
            </div>

            {/* Small info rows */}
            <div style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Total Draw</span>
                    <span style={{ fontWeight: 'bold', color: ampColor }}>{totalAmps.toFixed(2)} A</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Ah Left</span>
                    <span style={{ fontWeight: 'bold' }}>{ahRemaining.toFixed(2)} / {(totalAh ?? 8.0).toFixed(1)} Ah</span>
                </div>
            </div>
        </div>
    );
};

export default SidebarAmpsDisplay;