import React, { useState } from "react";
import './Waypoint.css';

// Renders a single collapsible sidebar row for one waypoint marker.
// Expects a single `props` prop (an object) containing:
//   marker         - the waypoint data (name, point_type, radius, latitude, longitude, ...)
//   index          - this waypoint's index in the parent list
//   stateFunction  - (index, updatedMarker) => void, called to persist edits
//   moveFunction   - (fromIndex, toIndex) => void, reorders the waypoint list
//   submitFunction - (index) => void, publishes this single waypoint
//   deleteFunction - (index) => void, removes this waypoint
export default function Waypoint(props) {
  const typeEnum = ["GPS", "WAYPOINT", "ARUCO_0", "ARUCO_1", "ARUCO_2", "ARUCO_3", "BOTTLE", "HAMMER", "ROCKPICK"];
  // Unwrap the actual data from the `props` prop (see comment above).
  props = props.props;

  const [isCollapsed, setIsCollapsed] = useState(true);

  // Expands/collapses the detail section (lat/lon fields and move/submit/delete controls).
  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  // Local draft of the name field, committed to parent state on blur rather than on
  // every keystroke so typing doesn't trigger a re-render of the whole waypoint list.
  const [tempName, setTempName] = useState(props.marker.name ?? "");
  const handleNameBlur = () => {
    props.stateFunction(props.index, { ...props.marker, name: tempName });
  };

  return (
    <div className="waypoint-form">
      <div className="waypoint-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          value={tempName}
          placeholder={`Waypoint ${props.index}`}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleNameBlur}
          style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            background: 'transparent',
            width: '120px',
            minWidth: '120px',
            height: '25px'
          }}
        />

        <select
          value={props.marker.point_type}
          onChange={(e) =>
            props.stateFunction(props.index, { ...props.marker, point_type: Number(e.target.value) })
          }
        >
          {typeEnum.map((t, i) => (
            <option key={i} value={i + 1}>{t}</option>
          ))}
        </select>

        <label htmlFor="radius" style={{ marginLeft: '8px' }}>Radius:</label>
        <input
          type="number"
          id="radius"
          name="radius"
          value={props.marker.radius}
          onChange={(e) =>
            props.stateFunction(props.index, { ...props.marker, radius: Number(e.target.value) })
          }
          style={{ width: '80px' }}
        />

        <button
          type="button"
          onClick={toggleCollapsed}
          style={{
            marginLeft: 'auto',
            padding: '2px 4px',
            fontSize: '0.9rem'
          }}
        >
          {isCollapsed ? '▸' : '▾'}
        </button>
      </div>


      {!isCollapsed && (
        <>
          <div className="latlon-row" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}>
              <label>Latitude:</label><br />
              <input
                type="text"
                name="latitude"
                value={props.marker.latitude}
                onChange={(e) =>
                  props.stateFunction(props.index, { ...props.marker, latitude: e.target.value })
                }
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Longitude:</label><br />
              <input
                type="text"
                name="longitude"
                value={props.marker.longitude}
                onChange={(e) =>
                  props.stateFunction(props.index, { ...props.marker, longitude: e.target.value })
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>

        
          <div className="waypoint-controls" style={{ marginTop: '8px', display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button onClick={() => props.moveFunction(props.index, props.index - 1)}>Move Up</button>
            <button onClick={() => props.moveFunction(props.index, props.index + 1)}>Move Down</button>
            
            

            <button onClick={() => props.submitFunction(props.index)}>Submit Marker</button>

            
            <button
              onClick={() => props.moveFunction(props.index, 0)}
              title="Move to Top"
              style={{
                padding: '2px 6px',
                fontSize: '0.85rem',
                lineHeight: 1,
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⇈
            </button>

            
            <button
              onClick={() => props.moveFunction(props.index, 9999)}
              title="Move to Bottom"
              style={{
                padding: '2px 6px',
                fontSize: '0.85rem',
                lineHeight: 1,
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⇊
            </button>
            <button
              onClick={() => props.deleteFunction(props.index)}
              title="Delete waypoint"
              style={{
                padding: '2px 6px',
                fontSize: '0.75rem',
                lineHeight: 1,
                background: '#ff0000',
                color: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}