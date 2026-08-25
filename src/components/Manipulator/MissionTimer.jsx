import React, { useEffect, useState } from 'react';

const MissionTimer = ({ title = "Mission Timer" }) => {
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        let interval = null;

        if (running) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [running]);

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        return [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    return (
        <div
            style={{
                border: '1px solid #444',
                borderRadius: '6px',
                backgroundColor: '#1f1f1f',
                padding: '10px',
                color: 'white',
                width: '100%',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textAlign: 'center',
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: '34px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    color: '#00ff99',
                    marginBottom: '12px',
                }}
            >
                {formatTime(seconds)}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <button
                    onClick={() => setRunning(true)}
                    style={{
                        padding: '6px 10px',
                        backgroundColor: '#2d8f4e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Start
                </button>

                <button
                    onClick={() => setRunning(false)}
                    style={{
                        padding: '6px 10px',
                        backgroundColor: '#c97b00',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Pause
                </button>

                <button
                    onClick={() => {
                        setRunning(false);
                        setSeconds(0);
                    }}
                    style={{
                        padding: '6px 10px',
                        backgroundColor: '#b33939',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default MissionTimer;