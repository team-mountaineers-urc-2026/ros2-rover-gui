export const DebugTopicsRegistry = {

    map: [

        /* =========================
           POSITION & ORIENTATION
        ========================== */

        {
            name: "/mavros/global_position/global",
            direction: "subscriber",
            messageType: "sensor_msgs/NavSatFix",
            description: "Primary GPS position of the rover.",
            format: {
                header: "std_msgs/Header",
                latitude: "float64",
                longitude: "float64",
                altitude: "float64",
                position_covariance: "float64[9]",
                position_covariance_type: "uint8"
            }
        },

        {
            name: "/health_monitor/chassis_orientation",
            direction: "subscriber",
            messageType: "geometry_msgs/msg/Vector3",
            description: "Rover orientation (yaw stored in z).",
            format: {
                x: "float64",
                y: "float64",
                z: "float64 (yaw radians)"
            }
        },

        /* =========================
           WAYPOINT MANAGEMENT
        ========================== */

        {
            name: "/autonomy/waypoint_append",
            direction: "publisher",
            messageType: "robot_interfaces/msg/Waypoint",
            description: "Appends a waypoint to the autonomy queue.",
            format: {
                index: "int32",
                latitude: "float32",
                longitude: "float32",
                point_type: "int32",
                radius: "float32",
                parent: "int32",
                children: "int32[]"
            }
        },

        {
            name: "/autonomy/waypoint_pop",
            direction: "publisher",
            messageType: "std_msgs/msg/Empty",
            description: "Pops the next waypoint from the autonomy queue.",
            format: {}
        },

        {
            name: "/autonomy/waypoint_clear",
            direction: "publisher",
            messageType: "std_msgs/msg/Empty",
            description: "Clears all waypoints from autonomy queue.",
            format: {}
        },

        /* =========================
           AUTONOMY STATE
        ========================== */

        {
            name: "/autonomy/is_autonomous",
            direction: "subscriber",
            messageType: "std_msgs/msg/Bool",
            description: "Indicates if rover is in autonomous mode.",
            format: {
                data: "bool"
            }
        },

        {
            name: "/autonomy/goal_alert",
            direction: "subscriber",
            messageType: "std_msgs/msg/Bool",
            description: "Indicates if rover has reached goal.",
            format: {
                data: "bool"
            }
        },

        /* =========================
           DRIVETRAIN CONTROL
        ========================== */

        {
            name: "/drivetrain/indicator_cmd_vel",
            direction: "publisher",
            messageType: "std_msgs/msg/Bool",
            description: "Toggles drivetrain between teleop and autonomy.",
            format: {
                data: "bool"
            }
        },

        {
            name: "/drivetrain/speed_multiplier",
            direction: "publisher",
            messageType: "std_msgs/msg/Float32",
            description: "Sets autonomy speed multiplier (0.0–1.0).",
            format: {
                data: "float32"
            }
        }

    ],

    /* =========================
       OTHER PAGES (unchanged)
    ========================== */

    science: [
        {
            name: "/science/drill_speed",
            direction: "publisher",
            messageType: "std_msgs/msg/Float32",
            description: "Drill motor speed command."
        }
    ],

    cameras: [
        {
            name: "/camera/front",
            direction: "subscriber",
            messageType: "sensor_msgs/Image",
            description: "Front camera stream."
        }
    ]
};