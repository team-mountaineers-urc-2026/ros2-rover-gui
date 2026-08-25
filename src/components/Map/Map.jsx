import * as React from 'react';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Layer, Marker, Popup, Source } from 'react-map-gl';
import Pin from './pin.png';
import arucoPin from './arucoPin.png';
import hammerPin from './hammerPin.png';
import bottlePin from './bottlePin.png';
import Rover from './robot.png';
import rockpickPin from './rockpickPin.png';
import Waypoint from './Waypoint'
import 'maplibre-gl/dist/maplibre-gl.css';
import ROSLIB from 'roslib';
import { useEffect, useRef } from 'react';
import satelliteStyle from './satellite.json';
import costmapStyle from './costmap.json';
import './Map.css';
import { ReactSortable } from "react-sortablejs";
import Papa from "papaparse";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DebugContext } from "../Misc/DebugContext";
import { generateSearchPattern, offsetMetersToLngLat, nearestDistanceToPath } from './utils/SearchPatternService';

import { TelemetryContext } from "../Misc/TelemetryContext";

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090',
});




const MapPage = () => {
    const mapRef = useRef(null);
    const {
        setDebugId,
        setDebugData,
        logEvent,
        triggerFlowNode
    } = useContext(DebugContext);
    const [roverPosition, setRoverPosition] = React.useState({ latitude: 0, longitude: 0 });
    const [markerLocations, setMarkerLocations] = React.useState([]);
    const [roverPath, setRoverPath] = React.useState([]);
    const [selectedMarker, setSelectedMarker] = React.useState(-1);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [roverRotation, setRoverOrientation] = React.useState(0);
    const [viewState, setViewState] = React.useState({});
    const [mapStyle, setMapStyle] = React.useState(satelliteStyle);
    const [goalStatus, setGoalStatus] = React.useState(false);
    const [autonomyStatus, setAutonomyStatus] = React.useState(false);
    const [selectedAutonomyMode, setSelectedAutonomyMode] = React.useState(true);
    const [showShortcuts, setShowShortcuts] = React.useState(false);



    // Live-follow and measurement state used by the map canvas.
    const [followRover, setFollowRover] = React.useState(false);

    const [measureMode, setMeasureMode] = React.useState(false);
    const [measurePoints, setMeasurePoints] = React.useState([]); // max 2
    const [measureDistance, setMeasureDistance] = React.useState(null);


    const [distanceToNext, setDistanceToNext] = React.useState(null);
    const [estimatedSpeed, setEstimatedSpeed] = React.useState(null);
    const [smoothedSpeed, setSmoothedSpeed] = React.useState(null);
    const [etaToNext, setEtaToNext] = React.useState(null);
    const lastEtaUpdateRef = useRef(0);

    const lastPositionRef = useRef(null);
    const lastTimestampRef = useRef(null);

    const hoverRef = useRef(null);
    const { updateTelemetry } = useContext(TelemetryContext);

    const [importPanelOpen, setImportPanelOpen] = React.useState(false);
    // Search pattern state keeps the preview and committed markers aligned.
    const [searchPatterns, setSearchPatterns] = React.useState({});
    const [patternTypeByMarker, setPatternTypeByMarker] = React.useState({});
    const [detectionRangeByMarker, setDetectionRangeByMarker] = React.useState({});
    const [globalDetectionRange, setGlobalDetectionRange] = React.useState(5);
    const [patternSpacingByMarker, setPatternSpacingByMarker] = React.useState({});



    const [manualLat, setManualLat] = React.useState("");
    const [manualLon, setManualLon] = React.useState("");
    const typeEnum = ["GPS", "WAYPOINT", "ARUCO_0", "ARUCO_1", "ARUCO_2", "ARUCO_3", "BOTTLE", "HAMMER", "ROCKPICK"];
    const defaultType = typeEnum.indexOf("GPS") + 1; // => 1
    const [manualType, setManualType] = React.useState(defaultType);
    const [clickPointType, setClickPointType] = React.useState(defaultType);
    const [manualRadius, setManualRadius] = React.useState(10);


    const desiredSpeed = useRef(1); // Percentage from 0 to 1, where 1 is full speed



    // Generates a preview search pattern (points, connecting line, and a detection-radius
    // heatmap) around a given marker, in geographic coordinates. Returns null if the
    // marker's lat/lon can't be parsed.
    function buildSearchPattern(marker, patternType, detectionRange, spacing) {
        const originLat = Number(marker.latitude);
        const originLon = Number(marker.longitude);
        const radius = Number(marker.radius) || 10;

        if (Number.isNaN(originLat) || Number.isNaN(originLon)) return null;

        // Convert the local pattern into geographic coordinates.
        const localPts = generateSearchPattern(patternType, radius, spacing);

        const geographicPts = localPts.map((p) =>
            offsetMetersToLngLat(originLat, originLon, p.x, p.y)
        );

        const pointFeatures = geographicPts.map((p, i) => ({
            type: "Feature",
            properties: { originId: marker.id, pointIndex: i },
            geometry: {
                type: "Point",
                coordinates: [p.longitude, p.latitude],
            },
        }));

        const lineFeature = {
            type: "Feature",
            properties: { originId: marker.id, patternType },
            geometry: {
                type: "LineString",
                coordinates: geographicPts.map((p) => [p.longitude, p.latitude]),
            },
        };

        // Build the preview heatmap around the generated pattern.
        const heatFeatures = [];
        const sampleStep = 2; // Resolution of the heatmap grid

        for (let x = -radius; x <= radius; x += sampleStep) {
            for (let y = -radius; y <= radius; y += sampleStep) {
                if (x * x + y * y > radius * radius) continue;

                const d = nearestDistanceToPath({ x, y }, localPts);

                const weight = Math.max(0, 1 - (d / detectionRange));

                if (weight <= 0) continue;

                const sampleGeo = offsetMetersToLngLat(originLat, originLon, x, y);
                heatFeatures.push({
                    type: "Feature",
                    properties: {
                        originId: marker.id,
                        weight: weight,
                        lat: sampleGeo.latitude // CRITICAL: This must exist for the Layer to "get" it
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [sampleGeo.longitude, sampleGeo.latitude]
                    },
                });
            }
        }

        return {
            originId: marker.id,
            patternType,
            detectionRange,
            spacing,
            pointFeatures,
            lineFeature,
            heatFeatures,
        };
    }

 

    // Keep the telemetry panel's waypoint count in sync with local state.
    useEffect(() => {
        updateTelemetry("waypointCount", markerLocations.length);
    }, [markerLocations]);


    // Great-circle distance in meters between two lat/lon points (haversine formula).
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // meters
        const toRad = (deg) => deg * Math.PI / 180;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Removes a marker's entire descendant chain (children, grandchildren, etc.)
    // from the waypoint list, leaving the marker itself in place.
    const deleteChildren = (index) => {
        const parent = markerLocations[index];

        const idsToRemove = new Set();

        const collectChildren = (id) => {
            const node = markerLocations.find(m => m.id === id);
            if (!node) return;

            node.children.forEach(childId => {
                idsToRemove.add(childId);
                collectChildren(childId);
            });
        };

        collectChildren(parent.id);

        const newMarkers = markerLocations.filter(
            m => !idsToRemove.has(m.id)
        );

        setMarkerLocations(newMarkers);
    };

    // Removes every ancestor of a marker (walking up the parent chain) from the
    // waypoint list, then clears the selection.
    const deleteParents = (index) => {
        let current = markerLocations[index];

        const idsToRemove = new Set();

        while (current.parent) {
            idsToRemove.add(current.parent);
            current = markerLocations.find(m => m.id === current.parent);
            if (!current) break;
        }

        const newMarkers = markerLocations.filter(
            m => !idsToRemove.has(m.id)
        );

        setMarkerLocations(newMarkers);
        setSelectedMarker(-1);

    };

    // Flies the map camera to the MDRS site.
    // MDRS: 38.406379360537635, -110.7916846144491
    const jumpToMDRS = () => {
        triggerFlowNode("go_utah_input");
        triggerFlowNode("jumpToMDRS");

        const map = mapRef.current?.getMap();
        if (!map) return;

        map.flyTo({
            center: [-110.7916846144491, 38.406379360537635],
            zoom: 16,
            duration: 1000
        });

        logEvent("Jumped to MDRS");
    };

    // Flies the map camera to the rover's current live position.
    const jumpToRover = () => {
        triggerFlowNode("go_rover_input");
        triggerFlowNode("jumpToRover");

        const map = mapRef.current?.getMap();
        if (!map) return;

        map.flyTo({
            center: [roverPosition.longitude, roverPosition.latitude],
            zoom: 17,
            duration: 1000
        });

        logEvent("Jumped to Rover Position", {
            latitude: roverPosition.latitude,
            longitude: roverPosition.longitude
        });
    };

    // Flies the map camera to the Morgantown / AirBNB reference location.
    const jumpToMorgantown = () => {
        triggerFlowNode("go_morgantown_input");
        triggerFlowNode("jumpToMorgantown");

        const map = mapRef.current?.getMap();
        if (!map) return;

        map.flyTo({
            center: [-111.342020, 38.239893],
            zoom: 16,
            duration: 1000
        });

        logEvent("Jumped to Morgantown");
    };

    // Recomputes distance-to-next-waypoint and a smoothed ETA whenever the rover
    // moves or the waypoint queue changes.
    useEffect(() => {

        if (!markerLocations || markerLocations.length === 0) {
            setDistanceToNext(null);
            setEtaToNext(null);
            return;
        }

        const nextWaypoint = markerLocations[0];

        if (!roverPosition.latitude || !roverPosition.longitude) return;

        const distance = haversineDistance(
            roverPosition.latitude,
            roverPosition.longitude,
            nextWaypoint.latitude,
            nextWaypoint.longitude
        );

        setDistanceToNext(distance);

        const now = Date.now();

        if (smoothedSpeed && smoothedSpeed > 0.01) {

            if (now - lastEtaUpdateRef.current > 1000) {

                const newEta = distance / smoothedSpeed;

                setEtaToNext(prev =>
                    prev == null ? newEta : prev * 0.8 + newEta * 0.2
                );

                lastEtaUpdateRef.current = now;
            }
        }

    }, [roverPosition, markerLocations, estimatedSpeed]);

    // Registers global keyboard shortcuts (U/R/M to jump, F to follow, D to measure,
    // Backspace to delete selected waypoint, X to clear all waypoints).
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore when typing in inputs/textareas
            const tag = document.activeElement.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            switch (e.key.toLowerCase()) {

                // Jump shortcuts
                case "u":
                    jumpToMDRS();
                    break;

                case "r":
                    jumpToRover();
                    break;

                case "m":
                    jumpToMorgantown();
                    break;

                // Toggle follow rover
                case "f":
                    setFollowRover(prev => !prev);
                    break;

                // Measure mode
                case "d":
                    setMeasureMode(prev => !prev);
                    setMeasurePoints([]);
                    setMeasureDistance(null);
                    break;


                // Delete selected waypoint
                case "backspace":
                    removeMarker();
                    break;

                // Clear all waypoints
                case "x":
                    deleteAllWaypoints();
                    break;

                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        followRover,
        measureMode,
        selectedMarker,
        markerLocations
    ]);



    const positionTopic = "/mavros/global_position/global"
    const rotationTopic = "/health_monitor/chassis_orientation";

    var positionListener = new ROSLIB.Topic({
        ros: ros,
        name: positionTopic,
        messageType: 'sensor_msgs/NavSatFix',
        options: {
            qos: {
                reliability: 'best_effort',
                depth: 1,
            }
        }
    });

    // Publishes current map state to the shared debug panel while this page is mounted,
    // and clears it on unmount.
    //DEBUG PANEL INFORMATION
    useEffect(() => {
        setDebugId("map");
        setDebugData({
            markerCount: markerLocations.length,
            selectedMarker,
            latitude: roverPosition.latitude,
            longitude: roverPosition.longitude
        });

        return () => {
            setDebugId(null);
            setDebugData({});
        };
    }, [markerLocations, selectedMarker, roverPosition]);



    // Subscribes to the rover's GPS topic: updates rover position/telemetry and
    // derives a smoothed speed estimate from consecutive fixes.
    useEffect(() => {
        positionListener.subscribe((message) => {
            triggerFlowNode("/mavros/global_position/global");


            const now =
                message.header.stamp.sec * 1000 +
                message.header.stamp.nanosec / 1e6;

            const newPosition = {
                latitude: message.latitude,
                longitude: message.longitude
            };

            setRoverPosition(newPosition);
            updateTelemetry("latitude", (newPosition.latitude).toFixed(6));
            updateTelemetry("longitude", (newPosition.longitude).toFixed(6));

            // ---- SPEED ESTIMATION ----
            if (lastPositionRef.current && lastTimestampRef.current) {
                const dt = (now - lastTimestampRef.current) / 1000; // seconds
                if (dt > 0) {
                    const dist = haversineDistance(
                        lastPositionRef.current.latitude,
                        lastPositionRef.current.longitude,
                        newPosition.latitude,
                        newPosition.longitude
                    );

                    const rawSpeed = dist / dt; // m/s

                    setEstimatedSpeed(rawSpeed);

                    setSmoothedSpeed(prev =>
                        prev == null ? rawSpeed : prev * 0.85 + rawSpeed * 0.15
                    );
                }
            }

            lastPositionRef.current = newPosition;
            lastTimestampRef.current = now;

            setRoverPath(prev => {
                const updated = [...prev, [message.longitude, message.latitude]];
                if (updated.length > 1000) {
                    updated.shift();
                }
                return updated;
            });
        }
        )
    }, []);



    const location = useLocation();

    // Forces MapLibre to recompute its canvas size after navigating back to this page,
    // since it can be laid out with a stale size while hidden.
    useEffect(() => {
        if (location.pathname === "/Map") {
            const map = mapRef.current?.getMap();
            if (!map) return;

            requestAnimationFrame(() => {
                map.resize();
            });
        }
    }, [location]);

    const lastFollowRef = useRef({ lat: null, lon: null });

    // While "follow rover" is enabled, recenters the map on the rover whenever its
    // position changes.
    useEffect(() => {
        if (!followRover) return;

        const map = mapRef.current?.getMap();
        if (!map) return;

        if (
            lastFollowRef.current.lat === roverPosition.latitude &&
            lastFollowRef.current.lon === roverPosition.longitude
        ) return;

        lastFollowRef.current = roverPosition;

        map.jumpTo({
            center: [roverPosition.longitude, roverPosition.latitude]
        });

    }, [roverPosition, followRover]);

    var rotationListener = new ROSLIB.Topic({
        ros: ros,
        name: rotationTopic,
        messageType: 'geometry_msgs/msg/Vector3',
        options: {
            qos: {
                reliability: 'best_effort',
                depth: 1,
            }
        }
    });

    // Subscribes to the rover's chassis orientation topic to drive the rover marker's
    // rotation and heading telemetry.
    useEffect(() => {
        rotationListener.subscribe((message) => {

            triggerFlowNode("/health_monitor/chassis_orientation");
            setRoverOrientation(message.z);
            updateTelemetry("heading", message.z);
        })
    }, []);

    var waypointPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/autonomy/waypoint_append',
        messageType: 'robot_interfaces/msg/Waypoint'
    });

    const lines = React.useMemo(() => ({
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: markerLocations.map(m => [m.longitude, m.latitude])
        }
    }), [markerLocations]);

    // Initial compass bearing (0-360 degrees) from point 1 to point 2, used to
    // orient the direction arrows drawn between consecutive waypoints.
    function calculateBearing(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => deg * Math.PI / 180;
        const toDeg = (rad) => rad * 180 / Math.PI;

        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δλ = toRad(lon2 - lon1);

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x =
            Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);

        return (toDeg(θ) + 360) % 360; // normalize
    }

    const arrowGeoJSON = React.useMemo(() => ({
        type: "FeatureCollection",
        features: markerLocations.slice(0, -1).map((marker, i) => {
            const next = markerLocations[i + 1];
            const midLon = (marker.longitude + next.longitude) / 2;
            const midLat = (marker.latitude + next.latitude) / 2;

            const bearing = calculateBearing(
                marker.latitude,
                marker.longitude,
                next.latitude,
                next.longitude
            );
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [midLon, midLat]
                },
                properties: {
                    rotation: bearing
                }
            };
        })
    }), [markerLocations]);

    const roverLines = React.useMemo(() => ({
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: roverPath
        }
    }), [roverPath]);

    // Tracks the rosbridge WebSocket connection status and mirrors it into telemetry.
    useEffect(() => {
        ros.on('connection', () => {
            logEvent("Map Connected to ROS!");
            updateTelemetry("mapConnected", true);
        });

        ros.on('error', (error) => {
            logEvent('Map Connection error:', error);
            updateTelemetry("mapConnected", false);
        });

        ros.on('close', () => {
            logEvent('Map Connection closed', {}, "warn");
            updateTelemetry("mapConnected", false);

        });

        return () => {};
    }, []);


    // Handles clicks on the map: in measure mode, places/records the two measurement
    // points; otherwise (with Ctrl held) adds a new waypoint marker, chaining it as a
    // child of the previous marker.
    function addMarker(event) {

        triggerFlowNode("map_click_input");
        if (measureMode) {
            const { lng, lat } = event.lngLat;

            if (measurePoints.length === 0) {
                setMeasurePoints([{ latitude: lat, longitude: lng }]);
                setMeasureDistance(null);
            } else if (measurePoints.length === 1) {
                const first = measurePoints[0];
                const dist = haversineDistance(
                    first.latitude,
                    first.longitude,
                    lat,
                    lng
                );

                setMeasurePoints([
                    first,
                    { latitude: lat, longitude: lng }
                ]);
                setMeasureDistance(dist);
            } else {
                // reset if clicking again
                setMeasurePoints([{ latitude: lat, longitude: lng }]);
                setMeasureDistance(null);
            }

            return;
        }



        if (!event.originalEvent.ctrlKey) {
            return;
        }

        const newMarker = {
            id: crypto.randomUUID(),
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            point_type: clickPointType,
            radius: 10,
            parent: 0,
            children: []
        }

        triggerFlowNode("ctrl_click");
        triggerFlowNode("addMarker");
        logEvent("Waypoint placed via CTRL+Click", {
            latitude: newMarker.latitude,
            longitude: newMarker.longitude,
            point_type: newMarker.point_type
        });

        if (markerLocations.length === 0) {
            setMarkerLocations([newMarker]);
            return;
        }

        const prev = markerLocations[markerLocations.length - 1];

        newMarker.parent = prev.id;

        const updatedPrev = {
            ...prev,
            children: [...prev.children, newMarker.id]
        };

        const updatedMarkers = [
            ...markerLocations.slice(0, -1),
            updatedPrev,
            newMarker
        ];

        setMarkerLocations(updatedMarkers);
    }

    // Replaces the marker at `index` and, if it currently has an active search-pattern
    // preview, regenerates that preview to match the marker's new state.
    const updateMarker = (index, newMarker) => {
        const newMarkers = [...markerLocations];
        newMarkers[index] = newMarker;
        setMarkerLocations(newMarkers);

        if (searchPatterns[newMarker.id]) {
            const patternType =
                patternTypeByMarker[newMarker.id] ||
                searchPatterns[newMarker.id].patternType ||
                "spiral";

            const detectionRange = Number(
                detectionRangeByMarker[newMarker.id] ??
                searchPatterns[newMarker.id].detectionRange ??
                5
            );

            const spacing = Number(
                patternSpacingByMarker[newMarker.id] ??
                searchPatterns[newMarker.id].spacing ??
                4
            );

            const rebuilt = buildSearchPattern(newMarker, patternType, detectionRange, spacing);
            if (!rebuilt) return;

            setSearchPatterns((prev) => ({
                ...prev,
                [newMarker.id]: rebuilt,
            }));
        }
    };

    // Moves the marker at `index` to `newIndex` within the waypoint list, clamping
    // to the list bounds.
    const moveMarker = (index, newIndex) => {
        let targetIndex = newIndex;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= markerLocations.length) targetIndex = markerLocations.length - 1;

        if (index === targetIndex) return;

        const newMarkers = [...markerLocations];

        const [movedMarker] = newMarkers.splice(index, 1);

        newMarkers.splice(targetIndex, 0, movedMarker);


        logEvent("Waypoints Reordered", {
            moved: {
                name: movedMarker.name,
                id: movedMarker.id,
                fromIndex: index,
                toIndex: targetIndex
            }
        });

        setMarkerLocations(newMarkers);
    };


    // Deletes the currently-selected marker (if any) and clears the selection.
    function removeMarker() {
        if (selectedMarker >= 0) {
            const removedMarker = markerLocations[selectedMarker];

            const newMarkers = [...markerLocations];
            newMarkers.splice(selectedMarker, 1);

            logEvent("Waypoint Removed", {
                index: selectedMarker,
                id: removedMarker.id,

            });

            setMarkerLocations(newMarkers);
            setSelectedMarker(-1);
        }
    }

    // Deletes the marker at a specific index (used by the sidebar waypoint list)
    // and keeps the selected-marker index valid afterward.
    const deleteMarkerByIndex = (index) => {
        const removedMarker = markerLocations[index];
        setMarkerLocations((prev) => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
        logEvent("Waypoint Removed by index", {
            index: index,
            name: removedMarker.name,
            id: removedMarker.id,

        });


        setSelectedMarker((prev) =>
            prev === index ? -1 : prev > index ? prev - 1 : prev
        );
    };

    // Approximate ground distance (in meters) covered by one screen pixel at the
    // map's current latitude/zoom, used to size the radius overlay in pixels.
    function metersPerPixel(viewState) {
        viewState = viewState.viewState;
        const latitude = viewState.latitude;
        const zoom = viewState.zoom;
        const metersPerPixel = (Math.cos(latitude * 3.14 / 180) * 2 * 3.14 * 6378137) / (256 * Math.pow(2, zoom));
        return metersPerPixel;
    }

    // Publishes a single waypoint (by index) to the autonomy stack over ROS.
    const submitMarker = (index) => {
        triggerFlowNode("submit_markers_input");
        triggerFlowNode("submitMarkers");

        var marker = markerLocations[index];


        const parentIndex = markerLocations.findIndex(m => m.id === marker.parent);
        const childrenIndices = marker.children
            .map(childId => markerLocations.findIndex(m => m.id === childId))
            .filter(idx => idx !== -1);

        const msg = {
            index: index,
            latitude: parseFloat(marker.latitude),
            longitude: parseFloat(marker.longitude),
            point_type: marker.point_type,
            radius: marker.radius,
            parent: parentIndex !== -1 ? parentIndex : 0,
            children: childrenIndices
        }

        logEvent("Waypoint Published", {
            msg: msg,
        })
        waypointPublisher.publish(new ROSLIB.Message(msg));
    }

    // Publishes every waypoint in order to the autonomy stack over ROS.
    const submitMarkers = () => {
        triggerFlowNode("submitMarkers");
        if (markerLocations.length === 0 || markerLocations[0] == null) {
            logEvent("No Waypoints to Submit", {}, "error");
            return;
        }

        logEvent("All Waypoints Submitted:");
        markerLocations.forEach((marker, i) => {

            // Convert string UUIDs to actual array indices for ROS
            const parentIndex = markerLocations.findIndex(m => m.id === marker.parent);
            const childrenIndices = marker.children
                .map(childId => markerLocations.findIndex(m => m.id === childId))
                .filter(idx => idx !== -1);

            const msg = {
                index: i,
                latitude: parseFloat(marker.latitude),
                longitude: parseFloat(marker.longitude),
                point_type: marker.point_type,
                radius: marker.radius,
                parent: parentIndex !== -1 ? parentIndex : 0,
                children: childrenIndices
            }
            logEvent("Waypoint Published", {
                msg: msg,
            });
            waypointPublisher.publish(new ROSLIB.Message(msg));
        });
    }


    const autonomyStatusSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/autonomy/is_autonomous',
        messageType: 'std_msgs/msg/Bool'
    });
    const goalAlertSubscriber = new ROSLIB.Topic({
        ros: ros,
        name: '/autonomy/goal_alert',
        messageType: 'std_msgs/msg/Bool'
    });

    useEffect(() => {
        autonomyStatusSubscriber.subscribe((message) => {
            triggerFlowNode("/autonomy/is_autonomous");

            setAutonomyStatus(message.data);

            updateTelemetry("autonomy", message.data);
        })
    }, []);
    useEffect(() => {
        goalAlertSubscriber.subscribe((message) => {
            triggerFlowNode("/autonomy/goal_alert");

            setGoalStatus(message.data);

        });
    }, []);

    // Takes the first waypoint in the future waypoints queue to the current waypoint
    const autonomyQueuePopPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/autonomy/waypoint_pop',
        messageType: 'std_msgs/msg/Empty'
    });

    // Pops the next waypoint off the autonomy queue, making it the active goal.
    const autonomyQueuePop = () => {
        triggerFlowNode("pop_queue_input");
        triggerFlowNode("autonomyQueuePop");


        autonomyQueuePopPublisher.publish(new ROSLIB.Message({}));
        logEvent("Autonomy Queue Pop Published");

    }

    // Resets the autonomy queue
    const autonomyQueueClearPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/autonomy/waypoint_clear',
        messageType: 'std_msgs/msg/Empty'
    });
    // Clears the entire autonomy waypoint queue on the rover.
    const autonomyQueueClear = () => {
        triggerFlowNode("clear_queue_input");
        triggerFlowNode("autonomyQueueClear");

        autonomyQueueClearPublisher.publish(new ROSLIB.Message({}));
        logEvent("Autonomy Queue Clear Published")
    };

    // Toggles between autonomy and teleop mode
    const autonomyDriveToAutoPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/drivetrain/indicator_cmd_vel',
        messageType: 'std_msgs/msg/Bool'
    });
    // Toggles the rover between autonomy and teleop drive modes.
    const autonomyDriveToAuto = () => {
        triggerFlowNode("begin_autonomy_input");
        triggerFlowNode("autonomyDriveToAuto");

        const nextMode = !selectedAutonomyMode;
        autonomyDriveToAutoPublisher.publish(new ROSLIB.Message({ data: nextMode }));
        setSelectedAutonomyMode(nextMode);
        logEvent("Autonomy Mode Toggle Published", {
            from: selectedAutonomyMode,
            to: nextMode
        })


    };
    const autonomySetSpeedPublisher = new ROSLIB.Topic({
        ros: ros,
        name: '/drivetrain/speed_multiplier',
        messageType: 'std_msgs/msg/Float32'
    });
    // Reads the speed-multiplier input and publishes it to the drivetrain,
    // rejecting values outside the valid 0-1 range.
    const autonomySetSpeed = () => {
        triggerFlowNode("set_speed_input");
        triggerFlowNode("autonomySetSpeed");

        const speed = parseFloat(desiredSpeed.current.value);
        if (isNaN(speed) || speed < 0 || speed > 1) {
            console.error("Invalid speed value entered.");
            return;
        }
        autonomySetSpeedPublisher.publish(new ROSLIB.Message({ data: speed }));
        logEvent("Autonomy Set Speed Published", {
            speed: speed
        })
    };

    // Delete all locally-created waypoints/markers (UI + map), after user confirmation.
    const deleteAllWaypoints = () => {
        triggerFlowNode("delete_all_input");
        triggerFlowNode("deleteAllWaypoints");

        if (markerLocations.length === 0) return;

        const ok = window.confirm(
            `Delete all ${markerLocations.length} waypoint(s)? This cannot be undone.`
        );
        if (!ok) return;

        setMarkerLocations([]);
        setSelectedMarker(-1);
        logEvent("All Waypoints Removed", {
            removed: markerLocations.length
        });
    };


    // Exports the current waypoint list as a CSV file, using the File System Access
    // API when available and falling back to a browser download otherwise.
    const saveWaypointsToCSV = async () => {
        triggerFlowNode("save_csv_input");
        triggerFlowNode("saveWaypointsToCSV");

        if (!markerLocations || markerLocations.length === 0) {
            alert("No waypoints to save.");
            return;
        }

        const defaultName = prompt("Enter file name:", "waypoints.csv");
        if (!defaultName) return;

        const includeNames = markerLocations.some(
            (m) => (m.name ?? "").toString().trim().length > 0
        );

        const rows = markerLocations.map((m) => {
            const base = [
                Number(m.latitude),
                Number(m.longitude),
                Number(m.point_type),
                Number(m.radius),
            ];
            if (includeNames) base.push((m.name ?? "").toString());
            return base;
        });

        const csv = Papa.unparse(rows, { header: false });

        try {
            // If supported (probably will never be), ask where to save
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultName.endsWith(".csv")
                        ? defaultName
                        : `${defaultName}.csv`,
                    types: [{ description: "CSV Files", accept: { "text/csv": [".csv"] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(csv);
                await writable.close();
                return;
            }
        } catch (err) {
            // user cancelled save dialog
            return;
        }

        // Fallback: browser download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = defaultName.endsWith(".csv") ? defaultName : `${defaultName}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logEvent("Waypoints Saved to CSV", {
            name: defaultName
        })
    };

    // Search-pattern helpers keep preview, commit, and cleanup logic together.
    // Builds and stores a preview search pattern for a marker using its current
    // pattern-type/detection-range/spacing settings.
    const generateSearchPatternForMarker = (marker) => {
        const patternType = patternTypeByMarker[marker.id] || "star";
        const detectionRange = Number(detectionRangeByMarker[marker.id] ?? 5);
        const spacing = Number(patternSpacingByMarker[marker.id] ?? 4);

        const built = buildSearchPattern(marker, patternType, detectionRange, spacing);
        if (!built) return;

        setSearchPatterns((prev) => ({
            ...prev,
            [marker.id]: built,
        }));
    };

    // Discards the preview search pattern for a marker without committing it.
    const clearSearchPatternForMarker = (markerId) => {
        setSearchPatterns((prev) => {
            const next = { ...prev };
            delete next[markerId];
            return next;
        });
    };

    // Converts a previewed search pattern's points into real waypoints appended to
    // the queue, then removes the preview.
    const commitSearchPatternToQueue = (originMarker) => {
        const pattern = searchPatterns[originMarker.id];
        if (!pattern || !pattern.pointFeatures?.length) return;

        const committedMarkers = pattern.pointFeatures.map((feature, i) => {
            const [longitude, latitude] = feature.geometry.coordinates;

            return {
                id: crypto.randomUUID(),
                latitude,
                longitude,
                point_type: originMarker.point_type || 1,
                radius: originMarker.radius,
                parent: 0,
                children: [],
                name: `${originMarker.name || `Waypoint ${originMarker.id}`} Search ${i + 1}`,
            };
        });

        setMarkerLocations((prev) => [...prev, ...committedMarkers]);

        setSearchPatterns((prev) => {
            const next = { ...prev };
            delete next[originMarker.id];
            return next;
        });

        logEvent("Search Pattern Committed", {
            originId: originMarker.id,
            patternType: pattern.patternType,
            committedCount: committedMarkers.length,
        });
    };

    // Prunes search-pattern previews belonging to markers that no longer exist.
    React.useEffect(() => {
        const validIds = new Set(markerLocations.map((m) => m.id));

        setSearchPatterns((prev) => {
            const next = {};
            for (const key of Object.keys(prev)) {
                if (validIds.has(key)) next[key] = prev[key];
            }
            return next;
        });
    }, [markerLocations]);

    const searchPatternPointsGeoJSON = React.useMemo(() => ({
        type: "FeatureCollection",
        features: Object.values(searchPatterns).flatMap((p) => p.pointFeatures),
    }), [searchPatterns]);

    const searchPatternLinesGeoJSON = React.useMemo(() => ({
        type: "FeatureCollection",
        features: Object.values(searchPatterns)
            .map((p) => p.lineFeature)
            .filter(Boolean),
    }), [searchPatterns]);

    const searchPatternHeatGeoJSON = React.useMemo(() => ({
        type: "FeatureCollection",
        features: Object.values(searchPatterns).flatMap((p) => p.heatFeatures),
    }), [searchPatterns]);
    const lastMoveRef = useRef(0);
    return (
        <div id="app-container">
            <div className="map-section">
                <div className="map-jump-controls">
                    {/* GROUP 1: All the buttons on the left */}
                    <div className="left-controls">
                        <button onClick={jumpToMDRS}>Go to Utah</button>
                        <button onClick={jumpToRover}>Go to Rover</button>
                        <button onClick={jumpToMorgantown}>Go to AirBNB</button>
                        <button
                            onClick={() => setFollowRover(prev => !prev)}
                            style={{
                                background: followRover ? "#00aa00" : "",
                                color: followRover ? "white" : ""
                            }}
                        >
                            {followRover ? "Following Rover" : "Follow Rover"}
                        </button>
                        <button onClick={() => setMapStyle(mapStyle === satelliteStyle ? costmapStyle : satelliteStyle)}>
                            {mapStyle === satelliteStyle ? "Costmap" : "Satellite"}
                        </button>
                        <button
                            onClick={() => {
                                setMeasureMode(prev => !prev);
                                setMeasurePoints([]);
                                setMeasureDistance(null);
                            }}
                            style={{ background: measureMode ? "#00aa00" : "" }}
                        >
                            {measureMode ? "Exit Measure Mode" : "Measure Distance"}
                        </button>

                        {measureDistance != null && (
                            <div style={{ fontWeight: "bold", marginLeft: "8px" }}>
                                Distance: {measureDistance.toFixed(2)} m
                            </div>
                        )}
                    </div>

                    {/* GROUP 2: The dropdown forced to the right */}
                    <div className="point-type-selector">
                        <label>Point Type:</label>
                        <select
                            value={clickPointType}
                            onChange={(e) => setClickPointType(Number(e.target.value))}
                            title="Select Point Type for New Map Clicks"
                        >
                            {typeEnum.map((type, index) => (
                                <option key={index} value={index + 1}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="map-wrapper">
                    <div className="map-row">

                        <div className="map-container" id="map-container">

                            <Map
                                ref={mapRef}
                                preserveDrawingBuffer={true}

                                initialViewState={{
                                    longitude: -110.7916846144491,
                                    latitude: 38.406379360537635,
                                    zoom: 14
                                }}
                                onMove={(e) => {
                                    const now = Date.now();
                                    if (now - lastMoveRef.current < 200) return;
                                    lastMoveRef.current = now;
                                    setViewState(e.viewState);
                                }}
                                onDragStart={() => {
                                    if (followRover) setFollowRover(false);
                                }}
                                mapStyle={mapStyle}
                                onClick={addMarker}
                                dragRotate={false}
                                onLoad={(e) => {
                                    setIsLoaded(true);

                                    const map = e.target;
                                    map.on("mousemove", (e) => {
                                        if (!hoverRef.current) return;

                                        const { lat, lng } = e.lngLat;
                                        hoverRef.current.innerText =
                                            `Lat: ${lat.toFixed(6)}\nLon: ${lng.toFixed(6)}`;
                                    });


                                    // Arrow icon registration
                                    if (!map.hasImage("arrow-icon")) {
                                        const size = 40;
                                        const canvas = document.createElement("canvas");
                                        canvas.width = size;
                                        canvas.height = size;
                                        const ctx = canvas.getContext("2d");

                                        ctx.fillStyle = "#0390c7";
                                        ctx.beginPath();
                                        ctx.moveTo(size / 2, 0);
                                        ctx.lineTo(size * 0.9, size * 0.75);
                                        ctx.lineTo(size / 2, size * 0.6);
                                        ctx.lineTo(size * 0.1, size * 0.75);
                                        ctx.closePath();
                                        ctx.fill();

                                        const imageData = ctx.getImageData(0, 0, size, size);

                                        map.addImage("arrow-icon", {
                                            width: size,
                                            height: size,
                                            data: imageData.data
                                        });
                                    }


                                    map.addControl(
                                        new maplibregl.ScaleControl({
                                            maxWidth: 150,
                                            unit: 'metric'
                                        }),
                                        'bottom-left'
                                    );
                                }}
                            >

                                {measurePoints.map((point, idx) => (
                                    <Marker
                                        key={`measure-${idx}`}
                                        longitude={point.longitude}
                                        latitude={point.latitude}
                                    >
                                        <div style={{
                                            width: 10,
                                            height: 10,
                                            background: "#00ff00",
                                            borderRadius: "50%",
                                            border: "2px solid white"
                                        }} />
                                    </Marker>
                                ))}
                                {markerLocations.map((marker, index) => {
                                    const pt = marker.point_type;
                                    let iconSrc = Pin;
                                    if (pt === 2) iconSrc = Pin;
                                    else if (pt >= 3 && pt <= 6) iconSrc = arucoPin;
                                    else if (pt == 7) iconSrc = bottlePin;
                                    else if (pt === 8) iconSrc = hammerPin;
                                    else if (pt === 9) iconSrc = rockpickPin;
                                    return (
                                        <Marker
                                            key={index}
                                            longitude={marker.longitude}
                                            latitude={marker.latitude}
                                            draggable
                                            onClick={() => setSelectedMarker(index)}
                                            onDragEnd={(e) => {
                                                const { lng, lat } = e.lngLat;

                                                const updated = {
                                                    ...marker,
                                                    longitude: lng,
                                                    latitude: lat
                                                };

                                                updateMarker(index, updated);

                                                logEvent("Waypoint Dragged", {
                                                    id: marker.id,
                                                    newLat: lat,
                                                    newLon: lng
                                                });
                                            }}
                                        >
                                            <img src={iconSrc}
                                                alt="marker"
                                                style={{
                                                    width: 45,
                                                    height: 45,
                                                    objectFit: "contain"
                                                }} />
                                        </Marker>
                                    );
                                })}
                                <Marker longitude={roverPosition.longitude} latitude={roverPosition.latitude} rotation={(-roverRotation * (180 / Math.PI) + 360) % 360}>
                                    <img src={Rover} height={32}></img>
                                </Marker>
                                {selectedMarker >= 0 &&
                                    <Popup className="marker-popup"
                                        longitude={markerLocations[selectedMarker].longitude}
                                        latitude={markerLocations[selectedMarker].latitude}
                                        closeButton={false}
                                        closeOnClick={false}
                                        anchor="bottom"
                                        onClose={() => setSelectedMarker(-1)}>

                                        <div className="popup-content">
                                            <div className="popup-header">
                                                <span className="popup-title">{markerLocations[selectedMarker].name || `Waypoint ${selectedMarker}`}</span>
                                                <button className="popup-close" onClick={() => setSelectedMarker(-1)}>×</button>
                                            </div>
                                            <button className="popup-delete" onClick={removeMarker}>Delete</button>
                                            <button
                                                className="popup-delete"
                                                onClick={() => deleteChildren(selectedMarker)}
                                            >
                                                Delete Children
                                            </button>

                                            <button
                                                className="popup-delete"
                                                onClick={() => deleteParents(selectedMarker)}
                                            >
                                                Delete Parents
                                            </button>
                                            <div className="search-pattern-panel">
                                                <div className="search-pattern-title">Autonomous Search Planning</div>

                                                <div className="search-pattern-row">
                                                    <label>Pattern Type</label>
                                                    <select
                                                        value={patternTypeByMarker[markerLocations[selectedMarker].id] || "star"}
                                                        onChange={(e) =>
                                                            setPatternTypeByMarker((prev) => ({
                                                                ...prev,
                                                                [markerLocations[selectedMarker].id]: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="star">5-Point Star</option>
                                                        <option value="zigzag">Zig-Zag Bounce</option>
                                                    </select>
                                                </div>

                                                <div className="search-pattern-row">
                                                    <label>Detection Range (m)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="20"
                                                        step="0.5"
                                                        value={detectionRangeByMarker[markerLocations[selectedMarker].id] ?? globalDetectionRange}
                                                        onChange={(e) => {
                                                            const newVal = Number(e.target.value);


                                                            setGlobalDetectionRange(newVal);


                                                            setDetectionRangeByMarker((prev) => ({
                                                                ...prev,
                                                                [markerLocations[selectedMarker].id]: newVal,
                                                            }));
                                                        }}
                                                    />
                                                </div>

                                                <div className="search-pattern-row">
                                                    <label>Path Spacing (m)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="15"
                                                        step="0.5"
                                                        value={patternSpacingByMarker[markerLocations[selectedMarker].id] ?? 4}
                                                        onChange={(e) =>
                                                            setPatternSpacingByMarker((prev) => ({
                                                                ...prev,
                                                                [markerLocations[selectedMarker].id]: Number(e.target.value),
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div className="search-pattern-actions">
                                                    <button
                                                        className="pattern-btn generate"
                                                        onClick={() => generateSearchPatternForMarker(markerLocations[selectedMarker])}
                                                    >
                                                        Preview Pattern
                                                    </button>

                                                    <button
                                                        className="pattern-btn commit"
                                                        onClick={() => commitSearchPatternToQueue(markerLocations[selectedMarker])}
                                                        disabled={!searchPatterns[markerLocations[selectedMarker].id]}
                                                    >
                                                        Commit to Queue
                                                    </button>

                                                    <button
                                                        className="pattern-btn clear"
                                                        onClick={() => clearSearchPatternForMarker(markerLocations[selectedMarker].id)}
                                                    >
                                                        Clear Preview
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                }
                                {isLoaded &&
                                    <Source id="polylineLayer" type="geojson" data={lines}>
                                        <Layer
                                            id="lineLayer"
                                            type="line"
                                            source="polylineLayer"
                                            layout={{
                                                "line-join": "round",
                                                "line-cap": "round"
                                            }}
                                            paint={{
                                                "line-color": "rgba(3, 170, 238, 1)",
                                                "line-width": 5
                                            }}
                                        />
                                    </Source>

                                    
                                }
                                {isLoaded && markerLocations.length > 1 && (
                                    <Source id="arrow-source" type="geojson" data={arrowGeoJSON}>
                                        <Layer
                                            id="arrow-layer"
                                            type="symbol"
                                            layout={{
                                                "icon-image": "arrow-icon",
                                                "icon-size": 0.7,
                                                "icon-rotate": ["get", "rotation"],
                                                "icon-rotation-alignment": "map",
                                                "icon-allow-overlap": true
                                            }}
                                        />
                                    </Source>
                                )}
                                {isLoaded && searchPatternHeatGeoJSON.features.length > 0 && (
                                    <Source
                                        id="search-heat-source"
                                        type="geojson"
                                        data={searchPatternHeatGeoJSON}
                                        key={`heat-source-${globalDetectionRange}-${selectedMarker}`}
                                    >
                                        <Layer
                                            id="search-heat-layer"
                                            type="circle"
                                            paint={{
                                                'circle-radius': [
                                                    'interpolate',
                                                    ['exponential', 2],
                                                    ['zoom'],
                                                    0, 0,
                                                    // Sort of accurate scaling: Range * pixels_per_meter
                                                    // At zoom 20, 1 meter is approx 20-30 pixels depending on Lat.
                                                    20, [
                                                        '*',
                                                        (selectedMarker >= 0 && markerLocations[selectedMarker] ?
                                                            (detectionRangeByMarker[markerLocations[selectedMarker].id] ?? globalDetectionRange) :
                                                            globalDetectionRange),
                                                        ['/', 20, ['cos', ['*', ['get', 'lat'], Math.PI / 180]]]
                                                    ]
                                                ],
                                                'circle-color': [
                                                    'interpolate',
                                                    ['linear'],
                                                    ['get', 'weight'],
                                                    0, 'rgba(0, 255, 255, 0)',
                                                    0.2, 'rgba(161, 250, 19, 0.5)',
                                                    0.5, 'rgba(255, 196, 0, 0.5)',
                                                    1, 'rgba(255, 0, 0, 0.5)'
                                                ],
                                                'circle-blur': 1,
                                                'circle-opacity': 0.5
                                            }}
                                        />
                                    </Source>
                                )}

                                {isLoaded && searchPatternLinesGeoJSON.features.length > 0 && (
                                    <Source id="search-pattern-lines" type="geojson" data={searchPatternLinesGeoJSON}>
                                        <Layer
                                            id="search-pattern-line-layer"
                                            type="line"
                                            paint={{
                                                "line-color": "rgb(211, 252, 63)",
                                                "line-width": 2,
                                                "line-dasharray": [2, 2]
                                            }}
                                            layout={{
                                                "line-join": "round",
                                                "line-cap": "round"
                                            }}
                                        />
                                    </Source>
                                )}

                                {isLoaded && searchPatternPointsGeoJSON.features.length > 0 && (
                                    <Source id="search-pattern-points" type="geojson" data={searchPatternPointsGeoJSON}>
                                        <Layer
                                            id="search-pattern-points-layer"
                                            type="circle"
                                            paint={{
                                                "circle-radius": 4,
                                                "circle-color": "rgb(245, 180, 0)",
                                                "circle-stroke-width": 1,
                                                "circle-stroke-color": "rgba(255,255,255,0.35)"
                                            }}
                                        />
                                    </Source>
                                )}
                                {isLoaded &&
                                    <Source id="roverLineSource" type="geojson" data={roverLines}>
                                        <Layer
                                            id="roverLineLayer"
                                            type="line"
                                            source="roverLineSource"
                                            layout={{
                                                "line-join": "round",
                                                "line-cap": "round"
                                            }}
                                            paint={{
                                                "line-color": "rgba(255, 0, 0, 1)",
                                                "line-width": 5
                                            }}
                                        />
                                    </Source>
                                }
                                {isLoaded && measurePoints.length === 2 && (
                                    <Source
                                        id="measure-line"
                                        type="geojson"
                                        data={{
                                            type: "Feature",
                                            geometry: {
                                                type: "LineString",
                                                coordinates: measurePoints.map(p => [p.longitude, p.latitude])
                                            }
                                        }}
                                    >
                                        <Layer
                                            id="measure-layer"
                                            type="line"
                                            paint={{
                                                "line-color": "#00ff00",
                                                "line-width": 4,
                                                "line-dasharray": [2, 2]
                                            }}
                                        />
                                    </Source>
                                )}
                                {isLoaded && selectedMarker >= 0 &&
                                    <Source id="point-source" type="geojson" data={{
                                        type: 'FeatureCollection',
                                        features: [{
                                            type: 'Feature',
                                            geometry: {
                                                type: 'Point',
                                                coordinates: [markerLocations[selectedMarker].longitude,
                                                markerLocations[selectedMarker].latitude]
                                            }
                                        }]
                                    }}>
                                        <Layer id="point-layer" type="circle" paint={{
                                            'circle-radius': markerLocations[selectedMarker].radius / metersPerPixel({ viewState }),
                                            'circle-color': '#007cbf',
                                            'circle-opacity': 0.5
                                        }} />


                                        
                                    </Source>



                                }


                            </Map>
                            <div className="shortcuts-overlay">
                                {showShortcuts && (
                                    <div className="shortcuts-menu">
                                        <h4>Keyboard Shortcuts</h4>
                                        <ul>
                                            <li><kbd>U</kbd> <span>Go to Utah</span></li>
                                            <li><kbd>R</kbd> <span>Go to Rover</span></li>
                                            <li><kbd>M</kbd> <span>Go to Morgantown</span></li>
                                            <li><kbd>F</kbd> <span>Toggle Follow Rover</span></li>
                                            <li><kbd>D</kbd> <span>Toggle Measure Mode</span></li>
                                            <li><kbd>Backspace</kbd> <span>Delete Selected Waypoint</span></li>
                                            <li><kbd>X</kbd> <span>Delete All Waypoints</span></li>
                                            <li><kbd>Ctrl + Click</kbd> <span>Add Waypoint</span></li>
                                        </ul>
                                    </div>
                                )}
                                <button
                                    className="shortcuts-toggle-btn"
                                    onClick={() => setShowShortcuts(!showShortcuts)}
                                >
                                    {showShortcuts ? "Close Shortcuts" : "Keyboard Shortcuts"}
                                </button>
                            </div>
                            <div className="rover-telemetry-overlay">
                                <div className="overlay-title">Rover Telemetry</div>

                                <div>
                                    Distance:
                                    <strong>
                                        {distanceToNext != null
                                            ? `${distanceToNext.toFixed(2)} m`
                                            : "N/A"}
                                    </strong>
                                </div>

                                <div>
                                    Speed:
                                    <strong>
                                        {estimatedSpeed != null
                                            ? `${estimatedSpeed.toFixed(2)} m/s`
                                            : "N/A"}
                                    </strong>
                                </div>

                                <div>
                                    ETA:
                                    <strong>
                                        {etaToNext != null
                                            ? `${etaToNext.toFixed(1)} s`
                                            : "N/A"}
                                    </strong>
                                </div>
                            </div>

                            <div ref={hoverRef} className="latlon-overlay" />

                        </div>

                        <div className="sidebar">
                            <div className="sidebar-header">
                                <label>Autonomy Status: {autonomyStatus === false ? "Teleop\n" : goalStatus === false ? "Autonomy" : "Goal"}</label><br></br>
                                <label>Waypoint Reached: </label>
                            </div>

                            <div className="sidebar-controls">

                                <button onClick={submitMarkers}>Submit Markers</button>
                                <button onClick={autonomyQueuePop}>Pop From Queue</button>
                                <button onClick={autonomyDriveToAuto}>Begin Autonomy</button>

                                <div>
                                    <label for="speed_input">Speed:</label>
                                    <input type="number" id="speed_input" name="speed_input" min="0" max="1" step="0.01" ref={desiredSpeed} defaultValue={1} />
                                </div>

                                <button onClick={autonomySetSpeed}>Set Speed</button>
                                <button onClick={autonomyQueueClear}>Clear Queue</button>


                            </div>

                            <div className="waypoints-header">
                                <label>Waypoints:</label>
                                <button onClick={deleteAllWaypoints} disabled={markerLocations.length === 0}>
                                    Delete All
                                </button>

                            </div>
                            {goalStatus && (
                                <div className="arrived-banner">
                                    ARRIVED
                                </div>
                            )}
                            <div className="sidebar-content">

                                <ReactSortable
                                    list={markerLocations}
                                    setList={setMarkerLocations}
                                    animation={150}
                                    tag="ul"
                                >
                                    {markerLocations.map((marker, idx) => (
                                        <li key={marker.id} style={{ listStyle: 'none' }}>
                                            <Waypoint
                                                props={{
                                                    marker: marker,
                                                    stateFunction: updateMarker,
                                                    moveFunction: moveMarker,
                                                    submitFunction: submitMarker,
                                                    deleteFunction: deleteMarkerByIndex,
                                                    index: idx
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ReactSortable>
                            </div>
                            <div className="import-panel-container">
                                <div className={`import-panel ${importPanelOpen ? "open" : ""}`}>
                                    <h3>Add or Import Waypoints</h3>

                                    <div className="import-panel-grid">

                                        {/* Row 1 */}
                                        <div className="field">
                                            <label>Latitude: </label>
                                            <input
                                                type="text"
                                                value={manualLat}
                                                onChange={e => setManualLat(e.target.value)}
                                                placeholder="38.4"
                                            />
                                        </div>

                                        <div className="field">
                                            <label>Longitude</label>
                                            <input
                                                type="text"
                                                value={manualLon}
                                                onChange={e => setManualLon(e.target.value)}
                                                placeholder="-110.8"
                                            />
                                        </div>

                                        <div className="field">
                                            <label>Point Type</label>
                                            <select
                                                value={manualType}
                                                onChange={e => setManualType(Number(e.target.value))}
                                            >
                                                {typeEnum.map((t, i) => (
                                                    <option key={i} value={i + 1}>{t}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="field">
                                            <label>Radius</label>
                                            <input
                                                type="number"
                                                value={manualRadius}
                                                onChange={e => setManualRadius(Number(e.target.value))}
                                            />
                                        </div>
                                        <button
                                            className="add-waypoint-btn"
                                            onClick={() => {
                                                const lat = parseFloat(manualLat);
                                                const lon = parseFloat(manualLon);
                                                const pt = manualType;
                                                const rad = manualRadius;
                                                if (!isNaN(lat) && !isNaN(lon)) {
                                                    setMarkerLocations([
                                                        ...markerLocations,
                                                        { id: crypto.randomUUID(), latitude: lat, longitude: lon, point_type: pt, radius: rad, parent: 0, children: [] }
                                                    ]);
                                                    setManualLat("");
                                                    setManualLon("");
                                                    setManualType(1);
                                                    setManualRadius(10);
                                                } else {
                                                    alert("Invalid latitude or longitude");
                                                }

                                                triggerFlowNode("add_waypoint_manual_input");
                                                triggerFlowNode("manual_add");

                                                logEvent("Manual Waypoint Added", {
                                                    Latitude: lat,
                                                    Longitude: lon,
                                                    PointType: pt,
                                                    Radius: manualRadius
                                                })

                                            }}>
                                            Add Waypoint
                                        </button>
                                    </div>

                                    <div className="import-divider"></div>
                                    <div className="csv-controls">

                                        <div className='file-input-container'>
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={e => {

                                                    triggerFlowNode("csv_import_input");
                                                    triggerFlowNode("importFromCSV");

                                                    const file = e.target.files?.[0];
                                                    if (!file) {
                                                        logEvent("CSV Import: No file selected", {}, "error");
                                                        return;
                                                    }

                                                    Papa.parse(file, {
                                                        header: false,
                                                        complete: (results) => {
                                                            const newMarkers = results.data.map(fields => {
                                                                const [lat, lon, pt, rad, name] = fields;
                                                                return {
                                                                    id: crypto.randomUUID(),
                                                                    latitude: parseFloat(lat),
                                                                    longitude: parseFloat(lon),
                                                                    point_type: Number(pt),
                                                                    radius: Number(rad),
                                                                    parent: 0,
                                                                    children: [],
                                                                    name: name != null ? String(name).trim() : "",
                                                                };
                                                            }).filter(m => !isNaN(m.latitude) && !isNaN(m.longitude));
                                                            setMarkerLocations(prev => [...prev, ...newMarkers]);
                                                        }
                                                    });
                                                    logEvent("CSV Imported Successfully");

                                                    // reset file input so the same file can be uploaded again if needed
                                                    e.target.value = "";
                                                }}
                                            />


                                        </div>
                                        <button id="csv-save-button"
                                            onClick={saveWaypointsToCSV}
                                            disabled={markerLocations.length === 0}
                                        >
                                            Save CSV
                                        </button>

                                    </div>
                                </div>
                                <button
                                    className="import-toggle"
                                    onClick={() => setImportPanelOpen(prev => !prev)}
                                >
                                    {importPanelOpen
                                        ? "Close Import/Export Panel"
                                        : "Open Import/Export Panel"}
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>



        </div >


    );
}

export default MapPage;