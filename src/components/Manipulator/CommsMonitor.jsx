import React, { useEffect, useState } from 'react';
import ROSLIB from 'roslib';

const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes);
    let i = 0;

    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }

    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const signalColor = (value) => {
    if (value > -55) return '#4caf50';
    if (value > -70) return '#ff9800';
    return '#f44336';
};

const cardStyle = {
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '12px',
    color: 'white',
    width: '100%',
    boxSizing: 'border-box',
    height: '70%',
};

const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16pt',
    marginBottom: '6px',
};

const sectionTitle = {
    fontWeight: 'bold',
    color: '#90caf9',
    marginBottom: '10px',
    fontSize: '18pt',
    borderBottom: '1px solid #555',
};

const emptyStyle = {
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '12px 0',
};

const LinkSection = ({ title, data }) => {
    const safeValue = (value, suffix = '') => {
        if (value === undefined || value === null) return `0${suffix}`;
        return `${value}${suffix}`;
    };

    return (
        <div>
            <div style={sectionTitle}>{title}</div>

            <div style={rowStyle}>
                <span>CCQ</span>
                <span>{safeValue(data?.ccq, '%')}</span>
            </div>

            <div style={rowStyle}>
                <span>Base Signal</span>
                <span style={{ color: data ? signalColor(data.baseSignal) : '#777' }}>
                    {safeValue(data?.baseSignal, ' dBm')}
                </span>
            </div>

            <div style={rowStyle}>
                <span>Rover Signal</span>
                <span style={{ color: data ? signalColor(data.roverSignal) : '#777' }}>
                    {safeValue(data?.roverSignal, ' dBm')}
                </span>
            </div>

            <div style={rowStyle}>
                <span>Average RX</span>
                <span>{data ? formatBytes(data.Rx) : '0 B'}</span>
            </div>

            <div style={rowStyle}>
                <span>Average TX</span>
                <span>{data ? formatBytes(data.Tx) : '0 B'}</span>
            </div>

            <div style={rowStyle}>
                <span>Uptime</span>
                <span style={{ color: data ? signalColor(data.roverSignal) : '#777' }}>
                    {safeValue(data?.uptime, ' sec')}
                </span>
            </div>
             <div style={rowStyle}>
                <span>Distance</span>
                <span>{safeValue(data?.distance, 'meters')}</span>
            </div>            

        </div>
    );
};

const CommsMonitor = ({ frequencyFilter }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const ros = new ROSLIB.Ros({
            url: 'ws://localhost:9090',
        });

        const commsTopic = new ROSLIB.Topic({
            ros,
            name: '/health_monitor/communicatons_data',
            messageType: 'std_msgs/Int64MultiArray',
        });

        commsTopic.subscribe((msg) => {
            const d = msg.data;
            if (!d || d.length < 8) return;

            const parsed = {
                frequency: d[0],
                baseSignal: d[1],
                ccq: d[2],
                roverSignal: d[3],
                Rx: d[4],
                Tx: d[5],
                uptime: d[6],
                distance: d[7]
            };

            if (parsed.frequency === frequencyFilter) {
                setData(parsed);
            }
        });

        return () => {
            commsTopic.unsubscribe();
            ros.close();
        };
    }, [frequencyFilter]);

    return (
        <div style={cardStyle}>
            <LinkSection
                title={
                    frequencyFilter === 58
                        ? '5.8 GHz Link'
                        : '2.4 GHz Link'
                }
                data={data}
            />
        </div>
    );
};

export default CommsMonitor;