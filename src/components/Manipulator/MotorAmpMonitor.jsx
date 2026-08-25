import React, { useEffect, useState, useRef } from 'react';
import ROSLIB from 'roslib';
import { useAmps } from './AmpContext';

const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

const getBatteryLabel = (voltage) => {
    if (voltage >= 39.5) return { label: 'Almost Full', color: '#00cc44' };
    if (voltage >= 38.5) return { label: 'High', color: '#66cc00' };
    if (voltage >= 37.0) return { label: 'Medium', color: '#ffaa00' };
    if (voltage >= 36.1) return { label: 'Low', color: '#ff6600' };
    return { label: 'Almost Empty', color: '#cc0000' };
};

const getBatteryBars = (voltage) => {
    if (voltage >= 39.5) return 4;
    if (voltage >= 38.5) return 3;
    if (voltage >= 37.0) return 2;
    if (voltage >= 36.1) return 1;
    return 1;
};

const getAhFromVoltage = (voltage) => {
    if (voltage >= 40.0) return 8.0;
    if (voltage >= 39.0) return 7.0;
    if (voltage >= 38.5) return 6.0;
    if (voltage >= 37.9) return 5.0;
    if (voltage >= 37.5) return 4.5;
    if (voltage >= 37.1) return 4.0;
    if (voltage >= 36.9) return 3.5;
    if (voltage >= 36.7) return 3.0;
    if (voltage >= 36.4) return 2.0;
    if (voltage >= 36.0) return 1.0;
    return 0.5;
};

const ES_MOTORS = [
    'shoulder',
    'elbow',
    'wrist_pitch',
    'wrist_roll',
    'linear_rail',
    'gripper'
];

const SCIENCE_MOTORS = [
    'shoulder',
    'elbow',
    'wrist_pitch',
    'linear_rail'
];

const BatteryMonitor = () => {
    const [amps, setAmps] = useState({});
    const [voltages, setVoltages] = useState({});

    const ahUsedRef = useRef(0);
    const lastUpdateRef = useRef(Date.now());
    const totalAhInitialized = useRef(false);

    const {
        setTotalAmps,
        setAhUsed,
        totalAh,
        setTotalAh
    } = useAmps();

    // STATUS2 -> CURRENT
    useEffect(() => {
        const subs = [];

        ES_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/manipulator/${motor}/rcvd/status2`,
                messageType:
                    'controls_msgs/msg/ReadMotorStatus2MsgRecvParams',
            });

            sub.subscribe((msg) => {
                setAmps((prev) => ({
                    ...prev,
                    [`es_${motor}`]: msg.current_amps ?? 0,
                }));
            });

            subs.push(sub);
        });

        SCIENCE_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/science_manipulator/${motor}/rcvd/status2`,
                messageType:
                    'controls_msgs/msg/ReadMotorStatus2MsgRecvParams',
            });

            sub.subscribe((msg) => {
                setAmps((prev) => ({
                    ...prev,
                    [`sci_${motor}`]: msg.current_amps ?? 0,
                }));
            });

            subs.push(sub);
        });

        return () => subs.forEach((s) => s.unsubscribe());
    }, []);

    // STATUS1 -> VOLTAGE
    useEffect(() => {
        const subs = [];

        ES_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/manipulator/${motor}/rcvd/status1`,
                messageType:
                    'controls_msgs/msg/ReadMotorStatus1MsgRecvParams',
            });

            sub.subscribe((msg) => {
                setVoltages((prev) => {
                    const updated = {
                        ...prev,
                        [`es_${motor}`]: msg.voltage_volts,
                    };

                    if (!totalAhInitialized.current) {
                        const vals = Object.values(updated).filter(
                            (v) => v > 0
                        );

                        if (vals.length >= 3) {
                            const avg =
                                vals.reduce((a, b) => a + b, 0) /
                                vals.length;

                            setTotalAh(getAhFromVoltage(avg));
                            totalAhInitialized.current = true;
                        }
                    }

                    return updated;
                });
            });

            subs.push(sub);
        });

        SCIENCE_MOTORS.forEach((motor) => {
            const sub = new ROSLIB.Topic({
                ros,
                name: `/science_manipulator/${motor}/rcvd/status1`,
                messageType:
                    'controls_msgs/msg/ReadMotorStatus1MsgRecvParams',
            });

            sub.subscribe((msg) => {
                setVoltages((prev) => {
                    const updated = {
                        ...prev,
                        [`sci_${motor}`]: msg.voltage_volts,
                    };

                    if (!totalAhInitialized.current) {
                        const vals = Object.values(updated).filter(
                            (v) => v > 0
                        );

                        if (vals.length >= 3) {
                            const avg =
                                vals.reduce((a, b) => a + b, 0) /
                                vals.length;

                            setTotalAh(getAhFromVoltage(avg));
                            totalAhInitialized.current = true;
                        }
                    }

                    return updated;
                });
            });

            subs.push(sub);
        });

        return () => subs.forEach((s) => s.unsubscribe());
    }, []);

    // TOTAL CURRENT
    useEffect(() => {
        const total = Object.values(amps).reduce(
            (a, b) => a + Math.abs(b),
            0
        );

        setTotalAmps(total);
    }, [amps]);

    // AH INTEGRATION
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            const dtHours =
                (now - lastUpdateRef.current) / 3600000;

            lastUpdateRef.current = now;

            const total = Object.values(amps).reduce(
                (a, b) => a + Math.abs(b),
                0
            );

            ahUsedRef.current += total * dtHours;

            setAhUsed(ahUsedRef.current);
        }, 1000);

        return () => clearInterval(interval);
    }, [amps]);

    const totalAmps = Object.values(amps).reduce(
        (a, b) => a + Math.abs(b),
        0
    );

    const ahRemaining = Math.max(
        0,
        totalAh - ahUsedRef.current
    );

    const hoursLeft =
        totalAmps > 0
            ? ahRemaining / totalAmps
            : null;

    const minsLeft =
        hoursLeft !== null
            ? hoursLeft * 60
            : null;

    const voltageValues = Object.values(voltages).filter(
        (v) => v > 0
    );

    const avgVoltage =
        voltageValues.length > 0
            ? voltageValues.reduce((a, b) => a + b, 0) /
              voltageValues.length
            : null;

    const batteryStatus =
        avgVoltage !== null
            ? getBatteryLabel(avgVoltage)
            : null;

    const batteryBars =
        avgVoltage !== null
            ? getBatteryBars(avgVoltage)
            : 0;

    const isCritical =
        avgVoltage !== null && avgVoltage < 36.1;

    const styles = {
        container: {
            backgroundColor: 'var(--bg-panel, #2a2a2a)',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            fontFamily: 'sans-serif',
            color: 'var(--text-primary, white)',
            fontSize: '16px',
            height: '50%',
        },

        title: {
            fontWeight: 'bold',
            fontSize: '18pt',
            borderBottom: '1px solid #555',
            paddingBottom: '4px',
            marginBottom: '8px',
        },

        row: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '8px 0',
        },

        key: {
            color: '#aaa',
            fontSize: '16pt',
        },

        val: {
            fontWeight: 'bold',
            fontSize: '14pt',
        },

        badge: {
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '16px',
            backgroundColor: batteryStatus
                ? batteryStatus.color + '33'
                : '#333',
            color: batteryStatus
                ? batteryStatus.color
                : '#aaa',
            border: `1px solid ${
                batteryStatus
                    ? batteryStatus.color
                    : '#555'
            }`,
        },

        batteryWrapper: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },

        batteryBars: {
            display: 'flex',
            alignItems: 'flex-end',
            gap: '3px',
            height: '24px',
        },

        batteryBar: {
            width: '6px',
            borderRadius: '2px',
            backgroundColor: '#333',
            border: '1px solid #555',
        },

        blink: {
            animation: 'blinkBattery 1s infinite',
        },
    };

    return (
        <>
            <style>
                {`
                    @keyframes blinkBattery {
                        0% { opacity: 1; }
                        50% { opacity: 0.2; }
                        100% { opacity: 1; }
                    }
                `}
            </style>

            <div style={styles.container}>
                <div style={styles.title}>Battery</div>

                <div style={styles.row}>
                    <span style={styles.key}>Status</span>

                    <div style={styles.batteryWrapper}>
                        <div style={styles.batteryBars}>
                            {[0, 1, 2, 3].map((i) => {
                                const active = i < batteryBars;

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            ...styles.batteryBar,

                                            height: `${10 + i * 4}px`,

                                            backgroundColor: active
                                                ? isCritical
                                                    ? '#ff2222'
                                                    : '#00cc44'
                                                : '#222',

                                            border: active
                                                ? `1px solid ${
                                                      isCritical
                                                          ? '#ff4444'
                                                          : '#00ff66'
                                                  }`
                                                : '1px solid #555',

                                            ...(isCritical &&
                                            i === 0
                                                ? styles.blink
                                                : {}),
                                        }}
                                    />
                                );
                            })}
                        </div>

                        <span style={styles.badge}>
                            {batteryStatus
                                ? batteryStatus.label
                                : 'No Data'}
                        </span>
                    </div>
                </div>

                {avgVoltage !== null && (
                    <div style={styles.row}>
                        <span style={styles.key}>
                            Avg Voltage
                        </span>

                        <span style={styles.val}>
                            {avgVoltage.toFixed(1)} V
                        </span>
                    </div>
                )}

                <div style={styles.row}>
                    <span style={styles.key}>
                        Total Draw
                    </span>

                    <span style={styles.val}>
                        {totalAmps.toFixed(2)} A
                    </span>
                </div>

                <div style={styles.row}>
                    <span style={styles.key}>
                        Ah Remaining
                    </span>

                    <span style={styles.val}>
                        {ahRemaining.toFixed(2)} /{' '}
                        {totalAh.toFixed(1)} Ah
                    </span>
                </div>

                <div style={styles.row}>
                    <span style={styles.key}>
                        Est. Remaining
                    </span>

                    <span style={styles.val}>
                        {minsLeft !== null
                            ? minsLeft > 60
                                ? `${(
                                      minsLeft / 60
                                  ).toFixed(1)} hr`
                                : `${minsLeft.toFixed(0)} min`
                            : '--'}
                    </span>
                </div>
            </div>
        </>
    );
};

export default BatteryMonitor;