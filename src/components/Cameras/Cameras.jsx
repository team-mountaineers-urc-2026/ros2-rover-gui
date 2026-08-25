import React, { useEffect, useRef, useState } from 'react';
import SingleCam from './SingleCam';
import CamControlHeader from './CamControlHeader';
import { Canvas, Rect } from 'fabric';
import ROSLIB from 'roslib';
import html2canvas from 'html2canvas';

const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });
const stream_start = 1;
const stream_stop = 3;

const Cameras = ({ label, url }) => {
  // Refs
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const cameraPageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Canvas State
  const [canvas, setCanvas] = useState(null);
  const [camBarList, setCamBarList] = useState([]);
  const [streamingCams, setStreamingCams] = useState([]);
  const [forceValue, setForceValue] = useState(null);

  // Object Detection State
  const [isObjectMenuOpen, setIsObjectMenuOpen] = useState(false);
  const [isButtonMinimized, setIsButtonMinimized] = useState(false);
  const [folderData, setFolderData] = useState(null);
  const [selectedObjectImage, setSelectedObjectImage] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [captureFrameId, setCaptureFrameId] = useState('');
  const cm_msg = new ROSLIB.Topic({
    ros,
    name: '/camera_manager',
    messageType: 'robot_interfaces/msg/CameraManagerCommand',
  });

  const captureFrameTopic = new ROSLIB.Topic({
    ros,
    name: '/science/capture_frame',
    messageType: 'std_msgs/msg/String',
  });

  const handleCaptureFrame = (camera) => {
    const { lat, lon, alt, heading } = poseSnapshotRef.current;
    const payload = JSON.stringify({ camera, lat, lon, alt, heading });
    captureFrameTopic.publish(new ROSLIB.Message({ data: payload }));
  };
  const poseSnapshotRef = useRef({ lat: null, lon: null, alt: null, heading: null });

  useEffect(() => {
    const gpsTopic = new ROSLIB.Topic({
      ros, name: '/mavros/global_position/global',
      messageType: 'sensor_msgs/msg/NavSatFix',
    });
    gpsTopic.subscribe((msg) => {
      poseSnapshotRef.current = {
        ...poseSnapshotRef.current,
        lat: msg.latitude, lon: msg.longitude, alt: msg.altitude
      };
    });
    return () => gpsTopic.unsubscribe();
  }, []);

  useEffect(() => {
    const headingTopic = new ROSLIB.Topic({
      ros, name: '/health_monitor/chassis_orientation',
      messageType: 'geometry_msgs/msg/Vector3',
    });
    headingTopic.subscribe((msg) => {
      poseSnapshotRef.current = {
        ...poseSnapshotRef.current,
        heading: (-msg.z * (180 / Math.PI) + 360) % 360
      };
    });
    return () => headingTopic.unsubscribe();
  }, []);

  useEffect(() => {
    ros.on('connection', () => console.log('Cameras connected to ROS!'));
    ros.on('error', (error) => console.error('Cameras: connection error:', error));
    ros.on('close', () => console.log('Cameras: connection closed'));
    return () => console.log('Cameras: ROS connection closed');
  }, []);

  useEffect(() => {
    const forceTopic = new ROSLIB.Topic({
      ros,
      name: '/manipulator_force',
      messageType: 'std_msgs/msg/Float32',
    });
    forceTopic.subscribe((msg) => setForceValue(msg.data));
    return () => forceTopic.unsubscribe();
  }, []);

  // --- Canvas Initialization & Resizing ---
  useEffect(() => {
    let page = document.getElementById('Page');
    let isMounted = true;
    let timeoutId = null;

    if (canvasRef.current) {
      const initCanvas = new Canvas(canvasRef.current, {
        width: page?.offsetWidth || window.innerWidth,
        height: page?.offsetHeight || window.innerHeight,
        uniformScaling: false 
      });
      initCanvas.renderAll();

      fabricCanvasRef.current = initCanvas;
      setCanvas(initCanvas);

      const resizeCanvas = () => {
        if (!isMounted || !fabricCanvasRef.current) return;
        if (page) {
          initCanvas.setWidth(page.offsetWidth);
          initCanvas.setHeight(page.offsetHeight);
          initCanvas.calcOffset();
          initCanvas.renderAll();
        }
      };

      window.addEventListener('resize', resizeCanvas);
      const observer = new ResizeObserver(() => resizeCanvas());
      if (page) observer.observe(page);

      timeoutId = setTimeout(resizeCanvas, 50);

      return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('resize', resizeCanvas);
        if (page) observer.unobserve(page);
        initCanvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
  }, []);

  const addCameraBar = (cid) => {
    const activeCanvas = fabricCanvasRef.current;
    if (activeCanvas) {
      let bar = new Rect({
        top: 0, left: 0,
        originX: 'left',
        originY: 'top',
        width: cid === -2 ? 300 : 320,
        height: cid === -2 ? 300 : 180,
        fill: 'transparent',
        name: 'camera' + cid,
        subTargetCheck: true,
        minScaleLimit: 0.25,
        lockScalingFlip: true,
        cornerSize: 20,
        touchCornerSize: 128,
        transparentCorners: false,
        cornerColor: '#007BFF',
        lockUniScaling: true, 
      });
      
      bar.setControlsVisibility({
        mt: false, mb: false, ml: false, mr: false,
        tl: false, tr: false, bl: false,
        mtr: false,
      });

      bar.on('moving', () => {
        let camera = document.getElementById('camera' + cid);
        if (camera) {
          camera.style.left = bar.left + 'px';
          camera.style.top = bar.top + 'px';
        }
      });

      bar.on('scaling', () => {
        bar.set({ scaleY: bar.scaleX }); 
        let camera = document.getElementById('camera' + cid + '_frame');
        if (camera) {
          camera.style.width = bar.width * bar.scaleX + 'px';
          camera.style.height = bar.height * bar.scaleY + 'px';
        }
      });

      activeCanvas.add(bar);
      setCamBarList((prevBars) => [...prevBars, bar]);
      activeCanvas.requestRenderAll(); 
    }
  };

  const removeCameraBar = (cid) => {
    const activeCanvas = fabricCanvasRef.current;
    if (activeCanvas) {
      const objects = canvas.getObjects();
      const barToRemove = objects.find(obj => obj.name === 'camera' + cid);
      if (barToRemove) {
        canvas.remove(barToRemove);
        setCamBarList((prevBars) => prevBars.filter((bar) => bar !== barToRemove));
        activeCanvas.requestRenderAll();
      }
    }
  };

  const onStreamRefresh = (cid, starting, reqQuality) => {
    var tmp = cid;
    if (cid === -1) tmp = -1;
    else if (cid === -2) tmp = 80;

    const effcid = tmp;
    if (starting) {
      if (!streamingCams.includes(effcid)) {
        setStreamingCams((prevCams) => [...prevCams, effcid]);
        addCameraBar(cid);
      }
      const msg = { command_type: stream_start, camera_id: cid, quality: reqQuality, attribute: 100, attr_value: 0 };
      cm_msg.publish(new ROSLIB.Message(msg));
    } else {
      if (streamingCams.includes(effcid)) {
        setStreamingCams((prevCams) => prevCams.filter((cam) => cam !== effcid));
        removeCameraBar(cid);
      }
      const msg = { command_type: stream_stop, camera_id: cid, quality: 0, attribute: 100, attr_value: 0 };
      cm_msg.publish(new ROSLIB.Message(msg));
    }
  };

  const handleCameraPageScreenshot = async () => {
    const root = cameraPageRef.current;
    if (!root) return;

    try {
      const canvas = await html2canvas(root, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 1,
      });

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

      const link = document.createElement("a");
      link.download = `cameras_page_${timestamp}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
    }
  };

  // const handleSiteScreenshot = async (siteNum) => {
  //   const timestamp = new Date()
  //     .toISOString()
  //     .slice(0, 19)
  //     .replace(/[:T]/g, '-');

  //   const root = cameraPageRef.current;
  //   if (!root) return;

  //   const cameraUrls = [];

  //   // 1. Collect active iframe URLs
  //   const iframes = root.querySelectorAll("iframe");

  //   iframes.forEach((iframe) => {
  //     if (iframe.src) cameraUrls.push(iframe.src);
  //   });

  //   // 2. Create canvas grid
  //   const canvas = document.createElement("canvas");
  //   const ctx = canvas.getContext("2d");

  //   const cols = Math.ceil(Math.sqrt(cameraUrls.length || 1));
  //   const size = 320;

  //   canvas.width = cols * size;
  //   canvas.height = cols * size;

  //   // 3. Load images directly from stream endpoints
  //   const loadImage = (url) =>
  //     new Promise((resolve) => {
  //       const img = new Image();

  //       // CRITICAL for local streams (if CORS allows it)
  //       img.crossOrigin = "anonymous";

  //       img.onload = () => resolve(img);
  //       img.onerror = () => resolve(null);

  //       // force fresh frame (important for MJPEG)
  //       img.src = url + (url.includes("?") ? "&" : "?") + Date.now();
  //     });

  //   const images = await Promise.all(cameraUrls.map(loadImage));

  //   // 4. Draw frames
  //   images.forEach((img, i) => {
  //     if (!img) return;

  //     const x = (i % cols) * size;
  //     const y = Math.floor(i / cols) * size;

  //     ctx.drawImage(img, x, y, size, size);
  //   });

  //   // 5. Download
  //   const link = document.createElement("a");
  //   link.download = `site${siteNum}_cameras_${timestamp}.png`;
  //   link.href = canvas.toDataURL("image/png");
  //   link.click();
  // };

  const handleFolderSelection = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const structure = {};
    Array.from(files).forEach(file => {
      if (file.name.match(/\.(jpe?g|png|bmp|gif)$/i)) {
        const pathParts = file.webkitRelativePath.split('/');
        if (pathParts.length >= 2) {
          const folderName = pathParts[pathParts.length - 2];
          if (!structure[folderName]) structure[folderName] = [];
          structure[folderName].push({ name: file.name, url: URL.createObjectURL(file) });
        }
      }
    });
    setFolderData(structure);
    e.target.value = null;
  };

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  return (
    <div ref={cameraPageRef} style={{ position: 'relative', width: '100%', height: '100%', zIndex: 9999 }}>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <CamControlHeader streamUpdateFunc={onStreamRefresh} camBarList={camBarList} />
        <button onClick={() => handleCaptureFrame('gimbal')} style={{ ...styles.screenshotBtn, backgroundColor: '#8884d8' }}>
          Annotate Gimbal Frame
        </button>
        <button onClick={() => handleCaptureFrame('belly')} style={{ ...styles.screenshotBtn, backgroundColor: '#38bdf8' }}>
          Annotate Belly Gimbal Frame
        </button>
        <button onClick={() => handleCameraPageScreenshot()} style={styles.screenshotBtn}>
          Take Screenshot
        </button>
        <input
          type="number"
          placeholder="Cam ID"
          value={captureFrameId}
          onChange={e => setCaptureFrameId(e.target.value)}
          style={{ marginLeft: '10px', width: '70px', padding: '5px', borderRadius: '4px', border: '1px solid #444', backgroundColor: 'var(--button-color)', color: '#fff' }}
        />
        <button
          onClick={() => captureFrameId && handleCaptureFrame(captureFrameId.trim())}
          disabled={!captureFrameId}
          style={styles.screenshotBtn}
        >
          Capture Cam
        </button>
      </div>

        
      <div style={styles.camArrayContainer} id='Page'>
        <canvas id='canvas' ref={canvasRef} />
        {streamingCams.map((item) => (
          <SingleCam
            key={item}
            camera_id={item}
            streamUpdateFunc={onStreamRefresh}
            cm_ros_interface={cm_msg}
            canvas={canvas}
            forceValue={item === 12 ? forceValue : null}
          />
        ))}
      </div>

      {/* OBJECT DETECTION UI*/}
      <div style={styles.floatingContainer}>
        {isButtonMinimized ? (
          <button onClick={() => setIsButtonMinimized(false)} style={styles.minimizedButton}>
            ▶
          </button>
        ) : (
          <>
            <button onClick={() => { setIsButtonMinimized(true); setIsObjectMenuOpen(false); }} style={styles.collapseArrowButton}>
              ◀
            </button>
            <button onClick={() => setIsObjectMenuOpen(!isObjectMenuOpen)} style={styles.floatingObjectButton}>
              {isObjectMenuOpen ? 'Close Detection' : 'Detection Images'}
            </button>
          </>
        )}
      </div>

      {isObjectMenuOpen && !isButtonMinimized && (
        <div style={styles.objectMenuOverlay}>
          <div style={{ borderBottom: '1px solid var(--text-primary)', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Object Detections</h3>
            <input type="file" ref={fileInputRef} webkitdirectory="true" directory="true" multiple onChange={handleFolderSelection} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} style={styles.selectFolderButton}>
              {folderData ? 'Reselect Folder' : 'Select Desktop Folder'}
            </button>
          </div>

          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {!folderData ? (
              <p style={{ color: 'var(--text-primary)', fontSize: '12px' }}>Select the "Object images" folder.</p>
            ) : (
              Object.keys(folderData).map(folderName => (
                <div key={folderName} style={{ marginBottom: '8px' }}>
                  <div onClick={() => toggleFolder(folderName)} style={styles.folderHeader}>
                    {expandedFolders[folderName] ? '▼' : '▶'} {folderName} ({folderData[folderName].length})
                  </div>
                  {expandedFolders[folderName] && (
                    <div style={styles.fileList}>
                      {folderData[folderName].map(file => (
                        <div key={file.name} onClick={() => setSelectedObjectImage(file.url)} style={styles.fileItem}>
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedObjectImage && (
        <div style={styles.fullscreenModal} onClick={() => setSelectedObjectImage(null)}>
          <div style={styles.closeModalText}>Click to close</div>
          <img src={selectedObjectImage} alt="Selected Object" style={styles.fullscreenImage} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

const styles = {
  camArrayContainer: { display: 'block', height: 'calc(100% - 60px)' },
  screenshotBtn: { marginLeft: '10px', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #444', backgroundColor: 'var(--button-color)', color: '#fff' },
  
  floatingContainer: { position: 'absolute', bottom: '15px', left: '15px', zIndex: 10001, display: 'flex', gap: '6px', alignItems: 'center' },
  minimizedButton: { padding: '8px 12px', backgroundColor: 'var(--header-bg)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  collapseArrowButton: { padding: '8px 10px', backgroundColor: 'var(--header-bg)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  floatingObjectButton: { padding: '8px 15px', backgroundColor: 'var(--button-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  objectMenuOverlay: { position: 'absolute', bottom: '60px', left: '15px', width: '280px', height: '50%', minHeight: '300px', backgroundColor: 'var(--bg-sidebar-left)', color: 'var(--text-primary)', zIndex: 10000, borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', border: '1px solid #444' },
  selectFolderButton: { width: '100%', padding: '6px', backgroundColor: 'var(--button-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  folderHeader: { padding: '6px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  fileList: { padding: '4px 0 4px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  fileItem: { fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' },
  
  fullscreenModal: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10005, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
  closeModalText: { color: '#fff', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' },
  fullscreenImage: { maxHeight: '85%', maxWidth: '85%', border: '3px solid #555', borderRadius: '8px' }
};

export default Cameras;