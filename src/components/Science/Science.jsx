import * as React from 'react';
import ROSLIB from 'roslib';
import './Science.css';
import { useEffect, useState, useRef } from 'react';
import PoseData from "../Misc/PoseData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import html2canvas from 'html2canvas';

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090',
});

const SciencePage = () => {

    const CHART_COLORS = [
        "#8884d8",
        "#82ca9d",
        "#ffc658",
        "#ff7300",
        "#e25c3b",
        "#38bdf8",
        "#d846b4"
    ];

    const cuvetteGraphNames = {
        1: "Site 1 Control",
        2: "Site 1 Resazurin",
        3: "Site 1 Methylene Blue",
        4: "Site 1 Ninhydrin",
        5: "Site 2 Control",
        6: "Site 2 Resazurin",
        7: "Site 2 Methylene Blue",
        8: "Site 2 Ninhydrin",
    };

    const pumpOneInput = useRef(null);
    const pumpTwoInput = useRef(null);
    const cuvetteDegreesInput = useRef(null);

    const [isAutoPanoRunning, setIsAutoPanoRunning] = useState(false);

    const lightbulbOnIndicator = useRef(null);
    const vibrationMotorOnIndicator = useRef(true);

    const [probeTemp, setProbeTemp] = useState("INVALID");
    const [probeMoisture, setProbeMoisture] = useState("INVALID");

    const [temp1, setTemp1] = useState("INVALID");
    const [press1, setPress1] = useState("INVALID");
    const [hum1, setHum1] = useState("INVALID");
    const [temp2, setTemp2] = useState("INVALID");
    const [press2, setPress2] = useState("INVALID");
    const [hum2, setHum2] = useState("INVALID");

    const [spectrometerFiles, setSpectrometerFiles] = useState([]);
    const [selectedSpectrometerFiles, setSelectedSpectrometerFiles] = useState([]);
    const [spectroData, setSpectroData] = useState([]);
    const [dataTimestamp, setDataTimestamp] = useState("");

    const [lastCollectedFile, setLastCollectedFile] = useState(null);
    const [collectStatus, setCollectStatus] = useState('idle');

    const [liveMode, setLiveMode] = useState(false);
    const [isAbsorbance, setIsAbsorbance] = useState(false);
    const [liveSpectroData, setLiveSpectroData] = useState([]);

    const [cacheState, setCacheState] = useState({ 1: null, 2: null });
    const poseSnapshotRef = useRef({ lat: null, lon: null, alt: null, heading: null });
    const [pumpCountdown, setPumpCountdown] = useState({ 1: 0, 2: 0 });
    const [pumpDirection, setPumpDirection] = useState({ 1: null, 2: null });
    const [lockControls, setLockControls] = useState(false);
    const pump1Locked = lockControls && pumpCountdown[1] > 0;
    const pump2Locked = lockControls && pumpCountdown[2] > 0;
    const [activeCuvette, setActiveCuvette] = useState(null);

    const [fileFilter, setFileFilter] = useState('newest');
    const [fileSearch, setFileSearch] = useState('');

    const smooth = (values, window = 20) => {
        return values.map((_, i) => {
            const start = Math.max(0, i - Math.floor(window / 2));
            const end = Math.min(values.length, i + Math.floor(window / 2) + 1);
            const slice = values.slice(start, end);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });
    };

    const [gimbalFolderName, setGimbalFolderName] = useState("");
    const handleGimbalFolderChange = (e) => {
        if (typeof e.target.value === 'string') {
            setGimbalFolderName(e.target.value);
        }
    };

    const [panoHeading, setPanoHeading] = useState(null);
    const [panoCardinal, setPanoCardinal] = useState(null);

    const getCardinal = (deg) => {
        const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
        return cardinals[Math.round(deg / 45) % 8];
    };

    useEffect(() => {
        const headingListener = new ROSLIB.Topic({
            ros: ros,
            name: '/health_monitor/chassis_orientation',
            messageType: 'geometry_msgs/msg/Vector3',
        });
        headingListener.subscribe((msg) => {
            const deg = (-msg.z * (180 / Math.PI) + 360) % 360;
            setPanoHeading(deg);
            setPanoCardinal(getCardinal(deg));
        });
        return () => headingListener.unsubscribe();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => requestSpectrometerFiles(), 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const spectrometerDataListener = new ROSLIB.Topic({
            ros: ros,
            name: '/spectrometer/historical',
            messageType: 'robot_interfaces/SpectrometerData'
        });

        const handleData = (msg) => {
            if (msg.is_successful && msg.wavelengths?.length > 0 && msg.intensities?.length > 0) {
                try {
                    const incomingFileName = msg.filename || "Live Data";
                    const safeKey = incomingFileName.replace('.csv', '');
                    setSpectroData((prevData) => {
                        if (prevData.length === 0) {
                            return Array.from(msg.wavelengths).map((wave, index) => ({
                                wavelength: Number(wave),
                                [safeKey]: Number(msg.intensities[index])
                            }));
                        }
                        return prevData.map((row, index) => ({
                            ...row,
                            [safeKey]: Number(msg.intensities[index])
                        }));
                    });
                    setDataTimestamp(new Date().toLocaleTimeString());
                } catch (err) {
                    console.error("Error merging spectrometer data:", err);
                }
            } else {
                console.warn("Received malformed data from spectrometer", msg);
            }
        };

        spectrometerDataListener.subscribe(handleData);
        return () => spectrometerDataListener.unsubscribe(handleData);
    }, []);

    useEffect(() => {
        const collectListener = new ROSLIB.Topic({
            ros: ros,
            name: '/spectrometer/collect_data',
            messageType: 'robot_interfaces/SpectrometerData'
        });

        const handleCollect = (msg) => {
            if (!msg.is_successful) return;
            setLastCollectedFile(msg.filename + '.csv');
            setCollectStatus('saved');
            setTimeout(() => requestSpectrometerFiles(), 1000);
            setTimeout(() => setCollectStatus('idle'), 4000);
        };

        collectListener.subscribe(handleCollect);
        return () => collectListener.unsubscribe(handleCollect);
    }, []);

    useEffect(() => {
        const liveListener = new ROSLIB.Topic({
            ros: ros,
            name: '/spectrometer/result',
            messageType: 'robot_interfaces/SpectrometerData'
        });

        const handleLive = (msg) => {
            if (!msg.is_successful || !msg.wavelengths?.length) return;
            if (!liveMode) return;
            const rawIntensities = Array.from(msg.intensities).map(Number);
            const smoothed = smooth(rawIntensities, 10);
            const chartData = Array.from(msg.wavelengths).map((wave, i) => ({
                wavelength: Number(wave),
                live: smoothed[i]
            }));
            setLiveSpectroData(chartData);
            setDataTimestamp(new Date().toLocaleTimeString());
        };

        liveListener.subscribe(handleLive);
        return () => liveListener.unsubscribe(handleLive);
    }, [liveMode]);

    useEffect(() => {
        ros.on('connection', () => console.log('Science connected to ROS'));
        ros.on('error', (error) => console.error('Science connection error: ', error));
        ros.on('close', () => console.log('Science connection closed'));
        return () => console.log('Science unmounted');
    }, []);

    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: '/science/manipulator_temp', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setProbeTemp(msg.data));
        return () => t.unsubscribe();
    }, []);

    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: '/science/manipulator_moisture', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => {
            const percentage = 100 - (msg.data / 1023) * 100;
            setProbeMoisture(percentage);
        });
        return () => t.unsubscribe();
    }, []);

    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/temp1', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setTemp1(msg.data));
        return () => t.unsubscribe();
    }, []);
    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/pressure1', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setPress1(msg.data));
        return () => t.unsubscribe();
    }, []);
    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/humidity1', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setHum1(msg.data));
        return () => t.unsubscribe();
    }, []);
    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/temp2', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setTemp2(msg.data));
        return () => t.unsubscribe();
    }, []);
    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/pressure2', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setPress2(msg.data));
        return () => t.unsubscribe();
    }, []);
    useEffect(() => {
        const t = new ROSLIB.Topic({ ros, name: 'science/humidity2', messageType: 'std_msgs/msg/Float32' });
        t.subscribe((msg) => setHum2(msg.data));
        return () => t.unsubscribe();
    }, []);

    useEffect(() => {
        const sub = new ROSLIB.Topic({
            ros: ros,
            name: '/base_station/spectro_graph_list',
            messageType: 'robot_interfaces/msg/StringArray'
        });
        sub.subscribe((msg) => setSpectrometerFiles(msg.data));
        return () => sub.unsubscribe();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPumpCountdown(prev => ({
                1: prev[1] > 0.1 ? prev[1] - 0.1 : 0,
                2: prev[2] > 0.1 ? prev[2] - 0.1 : 0
            }));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const gimbalTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/gimbal_move_pos',
        messageType: 'sensor_msgs/msg/JointState'
    });
    const gimbalNewFolderTopic = new ROSLIB.Topic({
        ros: ros,
        name: 'science/new_file',
        messageType: 'std_msgs/msg/String'
    });
    const actuatorTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/science/actuator_pos',
        messageType: 'robot_interfaces/msg/STargetedFloat'
    });
    const PumpPublisher = new ROSLIB.Topic({
        ros: ros,
        name: 'science/pump/milliliters',
        messageType: 'robot_interfaces/msg/TargetedFloat'
    });
    const cuvetteRotationTopicPublisher = new ROSLIB.Topic({
        ros: ros,
        name: 'science/carousel/curr_cuvette',
        messageType: 'std_msgs/msg/Int32'
    });
    const relayPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/relay_status',
        messageType: 'robot_interfaces/msg/STargetedBool',
    });
    const cacheCommandPublisher = new ROSLIB.Topic({
        ros: ros,
        name: 'science/cache_closed',
        messageType: 'robot_interfaces/msg/TargetedBool'
    });
    const spectrometerGeneratePublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/base_station/spectro_graph_gen',
        messageType: 'robot_interfaces/msg/StringArray'
    });
    const spectroFolderRequestPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/base_station/spectro_folder_req',
        messageType: 'std_msgs/msg/Empty'
    });
    const spectrometerBaselineTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/spectrometer/capture_baseline',
        messageType: 'std_msgs/msg/Empty'
    });
    const spectrometerResetBaselineTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/spectrometer/reset_baseline',
        messageType: 'std_msgs/msg/Empty'
    });
    const spectrometerSnapshotTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/spectrometer/save_snapshot',
        messageType: 'std_msgs/msg/String'
    });
    const spectrometerCollectTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/spectrometer/collect_data_req',
        messageType: 'std_msgs/msg/String'
    });
    const spectrometerSetStreamingTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/spectrometer/set_streaming',
        messageType: 'std_msgs/msg/Bool'
    });

    
    const newFolder = (folderName) => {
        if (typeof folderName === 'string' && folderName.length > 0) {
            gimbalNewFolderTopic.publish(new ROSLIB.Message({ data: folderName }));
        }
    };

    const handleActuator = (value) => {
        actuatorTopic.publish(new ROSLIB.Message({ target: 'act', data: value }));
    };

    const pumpTimePerML = 7;

    const handlePumpOne = (direction) => {
        const volume = Math.abs(parseFloat(pumpOneInput.current.value));
        if (volume <= 0) return;
        PumpPublisher.publish(new ROSLIB.Message({ data: volume * direction, target: 1 }));
        setPumpCountdown(prev => ({ ...prev, 1: volume * pumpTimePerML }));
        setPumpDirection(prev => ({ ...prev, 1: direction }));
    };
    const handlePumpTwo = (direction) => {
        const volume = Math.abs(parseFloat(pumpTwoInput.current.value));
        if (volume <= 0) return;
        PumpPublisher.publish(new ROSLIB.Message({ data: volume * direction, target: 2 }));
        setPumpCountdown(prev => ({ ...prev, 2: volume * pumpTimePerML }));
        setPumpDirection(prev => ({ ...prev, 2: direction }));
    };

    const handleCuvetteRotationForward = () => {
        cuvetteRotationTopicPublisher.publish(
            new ROSLIB.Message({ data: parseInt(cuvetteDegreesInput.current.value - 1) })
        );
    };

    
        
    const handleLightbulbClick = () => {
        relayPublisher.publish(new ROSLIB.Message({
            target: "hb",
            data: lightbulbOnIndicator.current.checked
        }));
    };

    const gimbalPictureControlTopic = new ROSLIB.Topic({
        ros: ros,
        name: 'science/pano',
        messageType: 'std_msgs/msg/String',  // change from Int32 to String
    });

    const controlPicture = (intData) => {
        if (![0, 1, 2].includes(intData)) return;
        if (intData === 1) {
            // Bundle pose snapshot with stitch command
            const { lat, lon, alt, heading } = poseSnapshotRef.current;
            const payload = JSON.stringify({ command: 1, lat, lon, alt, heading });
            gimbalPictureControlTopic.publish(new ROSLIB.Message({ data: payload }));
        } else {
            gimbalPictureControlTopic.publish(new ROSLIB.Message({ data: JSON.stringify({ command: intData }) }));
        }
    };


    const handleVibrationMotorClick = () => {
        relayPublisher.publish(new ROSLIB.Message({
            target: "vib",
            data: vibrationMotorOnIndicator.current.checked
        }));
    };

    const handleOpenCacheOne = () => {
        cacheCommandPublisher.publish(new ROSLIB.Message({ target: 1, data: false }));
        setCacheState(prev => ({ ...prev, 1: "open" }));
    };
    const handleCloseCacheOne = () => {
        cacheCommandPublisher.publish(new ROSLIB.Message({ target: 1, data: true }));
        setCacheState(prev => ({ ...prev, 1: "closed" }));
    };
    const handleOpenCacheTwo = () => {
        cacheCommandPublisher.publish(new ROSLIB.Message({ target: 2, data: false }));
        setCacheState(prev => ({ ...prev, 2: "open" }));
    };
    const handleCloseCacheTwo = () => {
        cacheCommandPublisher.publish(new ROSLIB.Message({ target: 2, data: true }));
        setCacheState(prev => ({ ...prev, 2: "closed" }));
    };

    const requestSpectrometerFiles = () => {
        spectroFolderRequestPublisher.publish(new ROSLIB.Message({}));
    };

    const handleCollectData = () => {
        setCollectStatus('waiting');
        setLastCollectedFile(null);
        const name = activeCuvette
            ? cuvetteGraphNames[activeCuvette] || `Cuvette ${activeCuvette}`
            : 'reading';
        spectrometerCollectTopic.publish(new ROSLIB.Message({ data: name }));
    };

    const handleLiveToggle = () => {
        const next = !liveMode;
        setLiveMode(next);
        spectrometerSetStreamingTopic.publish(new ROSLIB.Message({ data: next }));
        if (!next) setLiveSpectroData([]);
    };

    const handleCaptureBaseline = () => {
        if (!liveMode) {
            setLiveMode(true);
            spectrometerSetStreamingTopic.publish(new ROSLIB.Message({ data: true }));
        }
        spectrometerBaselineTopic.publish(new ROSLIB.Message({}));
        setIsAbsorbance(true);
    };

    const handleResetBaseline = () => {
        setIsAbsorbance(false);
        setLiveMode(false);
        spectrometerSetStreamingTopic.publish(new ROSLIB.Message({ data: false }));
        spectrometerResetBaselineTopic.publish(new ROSLIB.Message({}));
    };

    const handleSaveSnapshot = () => {
        spectrometerSnapshotTopic.publish(new ROSLIB.Message({ data: 'snapshot' }));
        setTimeout(() => requestSpectrometerFiles(), 1500);
    };

    const handleSpectrometerSelect = (e) => {
        const selectedFile = e.target.value;
        const isChecked = e.target.checked;
        const newSelection = isChecked
            ? [...selectedSpectrometerFiles, selectedFile]
            : selectedSpectrometerFiles.filter(f => f !== selectedFile);
        setSelectedSpectrometerFiles(newSelection);
        try {
            spectrometerGeneratePublisher.publish(new ROSLIB.Message({ data: newSelection }));
        } catch (err) {
            console.error("ROS Publish Error:", err);
        }
    };

    const handleAutoPano = (overrideName = null) => {
        if (isAutoPanoRunning) return;
        setIsAutoPanoRunning(true);

        const folderName = overrideName ?? gimbalFolderName.trim();
        if (folderName.length > 0) {
            newFolder(folderName);
            setGimbalFolderName(folderName);
        }

        controlPicture(2);

        let currentYaw = 180.0;
        const targetYaw = -180.0;
        const currentPitch = 0.0;
        const degreeStep = 30.0;

        const buildJointMsg = (yaw, pitch) => new ROSLIB.Message({
            header: { stamp: { sec: 0, nanosec: 0 }, frame_id: '' },
            name: ['yaw', 'pitch'],
            position: [yaw, pitch],
            velocity: [],
            effort: []
        });

        gimbalTopic.publish(buildJointMsg(currentYaw, currentPitch));

        setTimeout(() => {
            const panoInterval = setInterval(() => {
                currentYaw -= degreeStep;

                gimbalTopic.publish(buildJointMsg(currentYaw, currentPitch));
                setTimeout(() => controlPicture(0), 500);

                if (currentYaw <= targetYaw) {
                    clearInterval(panoInterval);
                    setTimeout(() => controlPicture(1), 4000); // stitch after last frame settles
                    setIsAutoPanoRunning(false);
                }
            }, 4000);
        }, 6000);
    };

    // ── Graph download ────────────────────────────────────────────────────────
    const graphRef = useRef(null);

    const handleDownloadGraph = () => {
        if (!graphRef.current) return;
        const name = activeCuvette
            ? cuvetteGraphNames[activeCuvette] || `Cuvette ${activeCuvette}`
            : "spectrometer_data";
        html2canvas(graphRef.current, { backgroundColor: "#ffffff" }).then((canvas) => {
            const link = document.createElement("a");
            link.download = `${name}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    };

    const handleDownloadGraphNamed = () => {
        if (!graphRef.current) return;
        const name = activeCuvette
            ? cuvetteGraphNames[activeCuvette] || `Cuvette ${activeCuvette}`
            : "spectrometer_data";

        // PNG download
        html2canvas(graphRef.current, { backgroundColor: "#ffffff" }).then((canvas) => {
            const link = document.createElement("a");
            link.download = `${name}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });

        // CSV — publishes cuvette name as filename to the same collect topic
        setCollectStatus('waiting');
        setLastCollectedFile(null);
        spectrometerCollectTopic.publish(new ROSLIB.Message({ data: name }));
    };

    // ── Site sensor screenshots ───────────────────────────────────────────────
    const probeRef = useRef(null);
    const envRef = useRef(null);

    const handleSiteScreenshot = (siteNum) => {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

        const probePromise = probeRef.current
            ? html2canvas(probeRef.current, { backgroundColor: "#ffffff" })
            : Promise.resolve(null);
        const envPromise = envRef.current
            ? html2canvas(envRef.current, { backgroundColor: "#ffffff" })
            : Promise.resolve(null);

        Promise.all([probePromise, envPromise]).then(([probeCanvas, envCanvas]) => {
            if (probeCanvas) {
                const link = document.createElement("a");
                link.download = `site${siteNum}pictures_probe_${timestamp}.png`;
                link.href = probeCanvas.toDataURL("image/png");
                link.click();
            }
            if (envCanvas) {
                setTimeout(() => {
                    const link = document.createElement("a");
                    link.download = `site${siteNum}pictures_env_${timestamp}.png`;
                    link.href = envCanvas.toDataURL("image/png");
                    link.click();
                }, 300);
            }
        });
    };

    // ── File list ─────────────────────────────────────────────────────────────
    const renderFileList = () => {
        const pairs = {};
        const loose = [];

        spectrometerFiles.forEach(file => {
            const absMatch = file.match(/^(.+)_absorbance\.csv$/);
            const rawMatch = file.match(/^(.+)_raw\.csv$/);
            if (absMatch) {
                const key = absMatch[1];
                pairs[key] = pairs[key] || {};
                pairs[key].absorbance = file;
            } else if (rawMatch) {
                const key = rawMatch[1];
                pairs[key] = pairs[key] || {};
                pairs[key].raw = file;
            } else {
                loose.push(file);
            }
        });

        let pairKeys = Object.keys(pairs);

        // Search filter
        if (fileSearch.trim()) {
            const q = fileSearch.trim().toLowerCase();
            pairKeys = pairKeys.filter(k => k.toLowerCase().includes(q));
        }

        // Sort
        if (fileFilter === 'alpha') {
            pairKeys.sort((a, b) => a.localeCompare(b));
        } else if (fileFilter === 'newest') {
            // Server returns files in order; reverse gives newest-first
            pairKeys.reverse();
        }

        const selectPair = (absorbance, raw) => {
            const toAdd = [absorbance, raw].filter(Boolean);
            const next = Array.from(new Set([...selectedSpectrometerFiles, ...toAdd]));
            setSelectedSpectrometerFiles(next);
            spectrometerGeneratePublisher.publish(new ROSLIB.Message({ data: next }));
        };

        return (
            <>
              

                {/* Pair groups */}
                {pairKeys.map(key => {
                    const { absorbance, raw } = pairs[key];
                    const bothSelected =
                        (!absorbance || selectedSpectrometerFiles.includes(absorbance)) &&
                        (!raw || selectedSpectrometerFiles.includes(raw));
                    return (
                        <div key={key} style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: '0.75em', color: '#aaa', paddingBottom: 2, borderBottom: '1px solid #333', marginBottom: 3 }}>
                                {key}
                            </div>
                            {[absorbance, raw].filter(Boolean).map(file => (
                                <label key={file} className="file-item" style={{ paddingLeft: 10 }}>
                                    <input
                                        type="checkbox"
                                        value={file}
                                        checked={selectedSpectrometerFiles.includes(file)}
                                        onChange={handleSpectrometerSelect}
                                    />
                                    <span className="file-name">
                                        {file.includes('_absorbance') ? '🟢 ' : '🟡 '}{file}
                                    </span>
                                </label>
                            ))}
                            <button
                                onClick={() => selectPair(absorbance, raw)}
                                disabled={bothSelected}
                                style={{ fontSize: '0.72em', marginLeft: 10, padding: '1px 7px', marginTop: 2 }}
                            >
                                Select Pair
                            </button>
                        </div>
                    );
                })}

                {/* Loose files (also filtered) */}
                {loose
                    .filter(f => !fileSearch.trim() || f.toLowerCase().includes(fileSearch.trim().toLowerCase()))
                    .map(file => (
                        <label key={file} className="file-item">
                            <input
                                type="checkbox"
                                value={file}
                                checked={selectedSpectrometerFiles.includes(file)}
                                onChange={handleSpectrometerSelect}
                            />
                            <span className="file-name">{file}</span>
                        </label>
                    ))
                }

                {pairKeys.length === 0 && loose.length === 0 && fileSearch.trim() && (
                    <div style={{ color: '#666', fontSize: '0.8em', padding: '8px 4px' }}>No files match "{fileSearch}"</div>
                )}
            </>
        );
    };

    const renderLines = () => {
        if (liveMode) {
            return (
                <Line
                    type="monotone"
                    dataKey="live"
                    name={isAbsorbance ? 'Absorbance' : 'Intensity'}
                    stroke="#38bdf8"
                    dot={false}
                    isAnimationActive={false}
                    strokeWidth={4}
                />
            );
        }
        return selectedSpectrometerFiles.map((fileName, index) => {
            const safeKey = fileName.replace('.csv', '');
            const isAbsorbanceFile = fileName.includes('_absorbance');
            const isRawFile = fileName.includes('_raw');
            const stroke = isAbsorbanceFile ? '#82ca9d' : isRawFile ? '#ffc658' : CHART_COLORS[index % CHART_COLORS.length];
            const label = isAbsorbanceFile ? `${safeKey} (Abs)` : isRawFile ? `${safeKey} (Raw)` : safeKey;
            return (
                <Line
                    key={safeKey}
                    type="monotone"
                    dataKey={safeKey}
                    name={label}
                    stroke={stroke}
                    strokeWidth={4}
                    dot={false}
                    isAnimationActive={false}
                    strokeDasharray={isRawFile ? '5 3' : undefined}
                />
            );
        });
    };

    return (
        <div id='container' className='science-page'>

            {/* Pumps */}
            <div id="pump-panel" className="panel">
                <div className="panel-title">Pumps</div>
                <div className="pump-layout">
                    <div className="pump-controls">
                        <div className="pump-row">
                            <label>Pump One (mL)</label>
                            <input type="number" min="0" step="1.0" defaultValue="0"
                                ref={pumpOneInput} disabled={pump1Locked} />
                            <div className="pump-buttons">
                                <button
                                    style={{ backgroundColor: (pumpCountdown[1] > 0 && pumpDirection[1] === 1) ? '#4CAF50' : '' }}
                                    onClick={() => handlePumpOne(1)} disabled={pump1Locked}
                                >Fwd</button>
                                <button
                                    style={{ backgroundColor: (pumpCountdown[1] > 0 && pumpDirection[1] === -1) ? '#FF9800' : '' }}
                                    onClick={() => handlePumpOne(-1)} disabled={pump1Locked}
                                >Rev</button>
                            </div>
                        </div>
                        <div className="pump-row">
                            <label>Pump Two (mL)</label>
                            <input type="number" min="0" step="1.0" defaultValue="0"
                                ref={pumpTwoInput} disabled={pump2Locked} />
                            <div className="pump-buttons">
                                <button
                                    style={{ backgroundColor: (pumpCountdown[2] > 0 && pumpDirection[2] === 1) ? '#4CAF50' : '' }}
                                    onClick={() => handlePumpTwo(1)} disabled={pump2Locked}
                                >Fwd</button>
                                <button
                                    style={{ backgroundColor: (pumpCountdown[2] > 0 && pumpDirection[2] === -1) ? '#FF9800' : '' }}
                                    onClick={() => handlePumpTwo(-1)} disabled={pump2Locked}
                                >Rev</button>
                            </div>
                        </div>
                    </div>
                    <div className="pump-timers">
                        <div className="pump-timer">
                            <div className="timer-label">Pump 1</div>
                            <div className="timer-value">{pumpCountdown[1].toFixed(1)}s</div>
                        </div>
                        <div className="pump-timer">
                            <div className="timer-label">Pump 2</div>
                            <div className="timer-value">{pumpCountdown[2].toFixed(1)}s</div>
                        </div>
                    </div>
                    <div className="lock-controls-container">
                        <button
                            className={`lock-button ${lockControls ? "active" : ""}`}
                            onClick={() => setLockControls(prev => !prev)}
                        >
                            Lock Controls: {lockControls ? "ON" : "OFF"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Cache */}
            <div id="cache" className="panel">
                <div className="panel-title">Caches</div>
                <div className="cache-content">
                    <div className="cache-row">
                        <span className="cache-label">Upper Cache</span>
                        <div className="cache-buttons">
                            <button className={cacheState[1] === "open" ? "active-open" : ""} onClick={handleOpenCacheOne}>Open</button>
                            <button className={cacheState[1] === "closed" ? "active-closed" : ""} onClick={handleCloseCacheOne}>Close</button>
                        </div>
                    </div>
                    <div className="cache-row">
                        <span className="cache-label">Lower Cache</span>
                        <div className="cache-buttons">
                            <button className={cacheState[2] === "open" ? "active-open" : ""} onClick={handleOpenCacheTwo}>Open</button>
                            <button className={cacheState[2] === "closed" ? "active-closed" : ""} onClick={handleCloseCacheTwo}>Close</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cuvette */}
            <div className="panel cuvette-panel">
                <div className="panel-title">Cuvette</div>
                <div className="cuvette-content">
                    <div className="cuvette-buttons">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <button
                                key={num}
                                className={`cuvette-btn ${activeCuvette === num ? 'cuvette-active' : ''}`}
                                onClick={() => {
                                    setActiveCuvette(num);
                                    cuvetteRotationTopicPublisher.publish(new ROSLIB.Message({ data: num - 1 }));
                                }}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                    <div className="cuvette-row">
                        <label htmlFor="cuvette-degrees">Cuvette #</label>
                        <input type="number" min="1" max="8" defaultValue="1" ref={cuvetteDegreesInput} />
                    </div>
                    <button onClick={handleCuvetteRotationForward}>Rotate To Cuvette</button>
                </div>
            </div>

            {/* Spectrometer */}
            <div className="panel spectrometer-panel">
                <div className="panel-title">Spectrometer</div>
                <div className="spectrometer-content">
                    <div className="spectrometer-controls">

                        <button
                            onClick={handleCollectData}
                            disabled={collectStatus === 'waiting'}
                            style={{
                                backgroundColor: collectStatus === 'saved' ? '#4CAF50' : collectStatus === 'waiting' ? '#888' : '',
                                fontWeight: 'bold'
                            }}
                        >
                            {collectStatus === 'waiting' ? '⏳ Reading...' : collectStatus === 'saved' ? '✓ Saved' : 'Collect Data'}
                        </button>

                        {lastCollectedFile && collectStatus === 'saved' && (
                            <span style={{ fontSize: '0.78em', color: '#82ca9d', alignSelf: 'center' }}>
                                {lastCollectedFile}
                            </span>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', borderTop: '1px solid #333', paddingTop: 6, marginTop: 4 }}>
                            <span style={{ fontSize: '0.8em', color: '#888', alignSelf: 'center' }}>Live stream:</span>
                            <button onClick={handleLiveToggle} style={{ backgroundColor: liveMode ? '#4CAF50' : '' }}>
                                {liveMode ? '● Live' : 'Live Off'}
                            </button>
                            <button onClick={handleCaptureBaseline} disabled={!liveMode}
                                title={!liveMode ? 'Enable live stream first' : 'Average last 10 frames as baseline'}>
                                Capture Baseline
                            </button>
                            <button onClick={handleSaveSnapshot} disabled={!isAbsorbance}
                                title={!isAbsorbance ? 'Capture a baseline first' : 'Save absorbance + raw CSVs'}>
                                Save Snapshot
                            </button>
                            {isAbsorbance && (
                                <span style={{ color: '#82ca9d', fontSize: '0.8em', alignSelf: 'center' }}>
                                    Absorbance mode
                                    <button onClick={handleResetBaseline} style={{ marginLeft: 6, fontSize: '0.8em', padding: '1px 6px' }}>✕</button>
                                </span>
                            )}
                        </div>

                        <div className="spectrometer-toggles">
                            <label>
                                <input type="checkbox" onClick={handleLightbulbClick} ref={lightbulbOnIndicator} />
                                Lightbulb
                            </label>
                            <label>
                                <input type="checkbox" onClick={handleVibrationMotorClick} ref={vibrationMotorOnIndicator} />
                                Vibration Motor
                            </label>
                            <button className="refresh-btn" onClick={requestSpectrometerFiles}>
                                Refresh Files
                            </button>

                            <button
                                onClick={handleDownloadGraph}
                                disabled={spectroData.length === 0 && liveSpectroData.length === 0}
                                title={activeCuvette ? `Save as "${cuvetteGraphNames[activeCuvette]}"` : 'Select a cuvette to name the file'}
                                style={{ backgroundColor: activeCuvette ? '#8884d8' : '', color: activeCuvette ? 'white' : '' }}
                            >
                                {activeCuvette ? `Save: ${cuvetteGraphNames[activeCuvette]}` : 'Save Graph as PNG'}
                            </button>

                            {/* Site sensor screenshots */}
                            <button onClick={() => handleSiteScreenshot(1)}>Save Site 1 Sensors</button>
                            <button onClick={() => handleSiteScreenshot(2)}>Save Site 2 Sensors</button>
                        </div>
                    </div>

                    <div className="spectrometer-files">
                        {/* Search + filter — always visible above the scrollable list */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={fileSearch}
                                onChange={e => setFileSearch(e.target.value)}
                                style={{
                                    flex: 1, minWidth: 100, padding: '3px 7px',
                                    backgroundColor: '#1e1e1e', color: '#eee',
                                    border: '1px solid #444', borderRadius: 4, fontSize: '0.8em'
                                }}
                            />
                            <button
                                onClick={() => setFileFilter('newest')}
                                style={{ fontSize: '0.75em', padding: '2px 8px', backgroundColor: fileFilter === 'newest' ? '#8884d8' : '', color: fileFilter === 'newest' ? 'white' : '' }}
                            >
                                Newest
                            </button>
                            <button
                                onClick={() => setFileFilter('alpha')}
                                style={{ fontSize: '0.75em', padding: '2px 8px', backgroundColor: fileFilter === 'alpha' ? '#8884d8' : '', color: fileFilter === 'alpha' ? 'white' : '' }}
                            >
                                A→Z
                            </button>
                        </div>
                        <div className="file-list">
                            {spectrometerFiles.length > 0 ? renderFileList() : <div className="no-files-text">No files found.</div>}
                        </div>
                    </div>

                    <div className="spectrometer-graph" ref={graphRef}>
                        {(spectroData.length > 0 || liveSpectroData.length > 0) && (
                            <div style={{
                                position: "absolute", top: "10px", right: "20px", zIndex: 10,
                                backgroundColor: "rgba(255,255,255,0.8)", padding: "4px 8px",
                                borderRadius: "4px", fontSize: "0.85em", fontWeight: "bold",
                                color: "#333", boxShadow: "0px 1px 3px rgba(0,0,0,0.1)"
                            }}>
                                {liveMode
                                    ? `Live — ${isAbsorbance ? 'Absorbance (AU)' : 'Intensity'} | ${dataTimestamp}`
                                    : `${selectedSpectrometerFiles[0] || "Spectrometer Data"} | ${dataTimestamp}`}
                            </div>
                        )}
                        {(liveMode ? liveSpectroData.length > 0 : spectroData.length > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={liveMode ? liveSpectroData : spectroData} margin={{ top: 30, right: 30, left: 20, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="5 5" />
                                    <XAxis
                                        dataKey="wavelength" type="number" domain={['dataMin', 'dataMax']}
                                        tickFormatter={(tick) => tick.toFixed(0)}
                                        label={{ value: 'Wavelength (nm)', position: 'insideBottom', offset: -15, style: { fill: '#666', fontSize: '0.9em' } }}
                                    />
                                    <YAxis
                                        domain={([dataMin, dataMax]) => {
                                            const padding = Math.max((dataMax - dataMin) * 0.1, 0.01);
                                            return [(Math.trunc(100* (dataMin - padding))/100), (Math.trunc(100*(dataMax + padding))/100)];
                                        }}
                                        label={{
                                            value: liveMode && isAbsorbance ? 'Absorbance (AU)' : 'Absorbance (AU)',
                                            angle: -90, position: 'insideLeft', offset: 10,
                                            style: { textAnchor: 'middle', fill: '#666', fontSize: '0.9em' }
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid #333' }}
                                        labelFormatter={(label) => `Wavelength: ${Number(label).toFixed(2)} nm`}
                                    />

                                    <Legend
                                        verticalAlign="top"
                                        align="center"
                                        wrapperStyle={{
                                            fontSize: '0.8em',
                                            paddingBottom: '10px'
                                        }}
                                    />

                                    {renderLines()}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'gray' }}>
                                {liveMode ? 'Waiting for live data...' : 'No spectrometer data loaded.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Probe */}
            <div className="panel probe-panel" ref={probeRef}>
                <div className="panel-title">Probe</div>
                <div className="probe-content">
                    <div className="probe-item">
                        <span className="probe-label">Temperature (°C) </span>
                        <span className={`probe-value ${probeTemp === "INVALID" ? "invalid" : ""}`}>
                            {typeof probeTemp === "number" ? probeTemp.toFixed(2) + " °C" : probeTemp}
                        </span>                    </div>
                    <div className="probe-item">
                        <span className="probe-label">Moisture (% VMC)</span>
                        <span className={`probe-value ${probeMoisture === "INVALID" ? "invalid" : ""}`}>
                            {typeof probeMoisture === "number" ? probeMoisture.toFixed(2) + " % VMC" : probeMoisture}
                        </span>                    
                    </div>
                </div>
            </div>

            {/* Environmental Sensors */}
            <div className="panel env-panel" ref={envRef}>
                <div className="panel-title">Environmental Sensors</div>
                <div className="env-columns">
                    <div className="env-sensor">
                        <div className="env-title">External</div>
                        <div className="probe-item">
                            <span className="probe-label">Temp</span>
                            <span className={`probe-value ${typeof temp1 !== "number" ? "invalid" : ""}`}>
                                {typeof temp1 === "number" ? temp1.toFixed(2) + " °C" : temp1}
                            </span>
                        </div>
                        <div className="probe-item">
                            <span className="probe-label">Pressure</span>
                            <span className={`probe-value ${typeof press1 !== "number" ? "invalid" : ""}`}>
                                {typeof press1 === "number" ? press1.toFixed(2) + " hPa" : press1}
                            </span>
                        </div>
                        <div className="probe-item">
                            <span className="probe-label">Humidity</span>
                            <span className={`probe-value ${typeof hum1 !== "number" ? "invalid" : ""}`}>
                                {typeof hum1 === "number" ? hum1.toFixed(2) + " % RH" : hum1}
                            </span>
                        </div>
                    </div>
                    <div className="env-sensor">
                        <div className="env-title">Internal</div>
                        <div className="probe-item">
                            <span className="probe-label">Temp</span>
                            <span className={`probe-value ${typeof temp2 !== "number" ? "invalid" : ""}`}>
                                {typeof temp2 === "number" ? temp2.toFixed(2) + " °C" : temp2}
                            </span>
                        </div>
                        <div className="probe-item">
                            <span className="probe-label">Pressure</span>
                            <span className={`probe-value ${typeof press2 !== "number" ? "invalid" : ""}`}>
                                {typeof press2 === "number" ? press2.toFixed(2) + " hPa" : press2}
                            </span>
                        </div>
                        <div className="probe-item">
                            <span className="probe-label">Humidity</span>
                            <span className={`probe-value ${typeof hum2 !== "number" ? "invalid" : ""}`}>
                                {typeof hum2 === "number" ? hum2.toFixed(2) + " % RH" : hum2}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gimbal */}
            <div className="panel gimbal-panel">
                <div className="gimbal-content">
                    <h2 className="panel-title">Gimbal Pano Control</h2>

                    <label htmlFor='gimbal-folder-name'>Pano Name</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input
                            type='text'
                            name='gimbal-folder-name'
                            id='gimbal-folder-name'
                            placeholder='e.g. site1_pano'
                            value={gimbalFolderName}
                            onChange={handleGimbalFolderChange}
                            style={{ flex: 1 }}
                        />
                        <button
                            onClick={() => newFolder(gimbalFolderName)}
                            disabled={!gimbalFolderName.trim()}
                        >
                            Set Folder
                        </button>
                    </div>

                    {panoHeading !== null && (
                        <div style={{ fontSize: '0.85em', color: '#aaa', marginBottom: 4 }}>
                            Heading: {panoHeading.toFixed(1)}° ({panoCardinal})
                        </div>
                    )}

                    <button
                        onClick={handleAutoPano}
                        disabled={isAutoPanoRunning}
                        style={{ backgroundColor: isAutoPanoRunning ? '#ff9800' : '#8884d8' }}
                        title={gimbalFolderName.trim() ? `Will save to folder: ${gimbalFolderName}` : 'Set a Pano Name above to save to a named folder'}
                    >
                        {isAutoPanoRunning ? 'Sweeping...' : `Auto-Pano${gimbalFolderName.trim() ? `: ${gimbalFolderName}` : ''}`}
                    </button>

                    <button
                        onClick={() => handleAutoPano('Site1Pano')}
                        disabled={isAutoPanoRunning}
                        style={{ backgroundColor: isAutoPanoRunning ? '#ff9800' : '#4CAF50' }}
                    >
                        {isAutoPanoRunning ? 'Sweeping...' : 'Take Site 1 Pano'}
                    </button>

                    <button
                        onClick={() => handleAutoPano('Site2Pano')}
                        disabled={isAutoPanoRunning}
                        style={{ backgroundColor: isAutoPanoRunning ? '#ff9800' : '#38bdf8' }}
                    >
                        {isAutoPanoRunning ? 'Sweeping...' : 'Take Site 2 Pano'}
                    </button>

                    

                    <button onClick={() => controlPicture(0)}>Take Picture</button>
                    <button onClick={() => controlPicture(1)}>Make Panorama</button>
                    <button onClick={() => controlPicture(2)} style={{ backgroundColor: '#e25c3b', color: 'white' }}>
                        Clear Pano Cache
                    </button>

                    <div className="gimble-pose">
                        <PoseData onDataUpdate={(data) => {
                            poseSnapshotRef.current = { ...poseSnapshotRef.current, ...data };
                        }} />
                    </div>
                </div>
            </div>

            {/* Linear Actuator */}
            <div id="lin-panel" className="panel">
                <div className="panel-title">Linear Actuator</div>
                <div className="actuator-content">
                    <div className="actuator-button-group">
                        <button className="act-btn extend" onClick={() => handleActuator(1.0)}>Extend</button>
                        <button className="act-btn stop" onClick={() => handleActuator(0.5)}>Stop</button>
                        <button className="act-btn retract" onClick={() => handleActuator(0.0)}>Retract</button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SciencePage;