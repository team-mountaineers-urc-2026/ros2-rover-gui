export const DebugFlowRegistry = {

  map: {

    nodes: [

      // ===============================
      // INPUT LAYER (y: 0)
      // ===============================

      { id: "go_utah_input", label: "Go to Utah", type: "input", x: -900, y: 0 },
      { id: "go_rover_input", label: "Go to Rover", type: "input", x: -700, y: 0 },
      { id: "go_morgantown_input", label: "Go to Morgantown", type: "input", x: -500, y: 0 },

      { id: "ctrl_click", label: "CTRL + Click", type: "input", x: -200, y: 0 },

      { id: "pop_queue_input", label: "Pop From Queue", type: "input", x: 200, y: 0 },
      { id: "clear_queue_input", label: "Clear Queue", type: "input", x: 400, y: 0 },
      { id: "begin_autonomy_input", label: "Begin Autonomy", type: "input", x: 600, y: 0 },
      { id: "set_speed_input", label: "Set Speed", type: "input", x: 800, y: 0 },

      { id: "delete_all_input", label: "Delete All Waypoints", type: "input", x: 1050, y: 0 },
      { id: "submit_markers_input", label: "Submit All Markers", type: "input", x: 1250, y: 0 },
      { id: "save_csv_input", label: "Save Waypoints to CSV", type: "input", x: 1450, y: 0 },


      // ===============================
      // FUNCTION LAYER (y: 200)
      // ===============================

      {
        id: "jumpToMDRS",
        label: "jumpToMDRS()",
        type: "function",
        x: -900,
        y: 200,
        reads: ["mapRef"],
        mutates: []
      },

      {
        id: "jumpToRover",
        label: "jumpToRover()",
        type: "function",
        x: -700,
        y: 200,
        reads: ["roverPosition"],
        mutates: []
      },

      {
        id: "jumpToMorgantown",
        label: "jumpToMorgantown()",
        type: "function",
        x: -500,
        y: 200,
        mutates: []
      },

      {
        id: "addMarker",
        label: "addMarker()",
        type: "function",
        x: -200,
        y: 200,
        reads: ["markerLocations"],
        mutates: ["markerLocations"]
      },

      {
        id: "autonomyQueuePop",
        label: "autonomyQueuePop()",
        type: "function",
        x: 200,
        y: 200,
        publishes: ["/autonomy/waypoint_pop"],
        publishMessageType: "std_msgs/msg/Empty",
        publishMessageStructure: {}
      },

      {
        id: "autonomyQueueClear",
        label: "autonomyQueueClear()",
        type: "function",
        x: 400,
        y: 200,
        publishes: ["/autonomy/waypoint_clear"],
        publishMessageType: "std_msgs/msg/Empty",
        publishMessageStructure: {}
      },

      {
        id: "autonomyDriveToAuto",
        label: "autonomyDriveToAuto()",
        type: "function",
        x: 600,
        y: 200,
        mutates: ["selectedAutonomyMode"],
        publishes: ["/drivetrain/indicator_cmd_vel"],
        publishMessageType: "std_msgs/msg/Bool",
        publishMessageStructure: {
          data: "bool"
        }
      },

      {
        id: "autonomySetSpeed",
        label: "autonomySetSpeed()",
        type: "function",
        x: 800,
        y: 200,
        publishes: ["/drivetrain/speed_multiplier"],
        publishMessageType: "std_msgs/msg/Float32",
        publishMessageStructure: {
          data: "float32"
        }
      },


      {
        id: "deleteAllWaypoints",
        label: "deleteAllWaypoints()",
        type: "function",
        x: 1050,
        y: 200,
        mutates: ["markerLocations", "selectedMarker"]
      },

      {
        id: "submitMarkers",
        label: "submitMarkers()",
        type: "function",
        x: 1250,
        y: 200,
        reads: ["markerLocations"],
        publishes: ["/autonomy/waypoint_append"],
        publishMessageType: "robot_interfaces/msg/Waypoint",
        publishMessageStructure: {
          index: "int32",
          latitude: "float64",
          longitude: "float64",
          point_type: "int32",
          radius: "float32",
          parent: "int32",
          children: "int32[]"
        }
      },

      {
        id: "saveWaypointsToCSV",
        label: "saveWaypointsToCSV()",
        type: "function",
        x: 1450,
        y: 200,
        reads: ["markerLocations"]
      },


      // ===============================
      // ROS SUBSCRIBERS
      // ===============================

      {
        id: "/mavros/global_position/global",
        label: "ROS: Global Position",
        type: "subscriber",
        x: -700,
        y: 400,
        messageType: "sensor_msgs/NavSatFix",
        messageStructure: {
          latitude: "float64",
          longitude: "float64",
          altitude: "float64"
        },
        mutates: ["roverPosition", "roverPath"]
      },

      {
        id: "/health_monitor/chassis_orientation",
        label: "ROS: Chassis Orientation",
        type: "subscriber",
        x: -500,
        y: 400,
        messageType: "geometry_msgs/msg/Vector3",
        messageStructure: {
          x: "float64",
          y: "float64",
          z: "float64"
        },
        mutates: ["roverRotation"]
      },

      {
        id: "/autonomy/is_autonomous",
        label: "ROS: Autonomy Status",
        type: "subscriber",
        x: 600,
        y: 400,
        messageType: "std_msgs/msg/Bool",
        messageStructure: {
          data: "bool"
        },
        mutates: ["autonomyStatus"]
      },

      {
        id: "/autonomy/goal_alert",
        label: "ROS: Goal Alert",
        type: "subscriber",
        x: 800,
        y: 400,
        messageType: "std_msgs/msg/Bool",
        messageStructure: {
          data: "bool"
        },
        mutates: ["goalStatus"]
      }

    ],

    edges: [

      { from: "go_utah_input", to: "jumpToMDRS" },
      { from: "go_rover_input", to: "jumpToRover" },
      { from: "go_morgantown_input", to: "jumpToMorgantown" },
      { from: "ctrl_click", to: "addMarker" },
      { from: "pop_queue_input", to: "autonomyQueuePop" },
      { from: "clear_queue_input", to: "autonomyQueueClear" },
      { from: "begin_autonomy_input", to: "autonomyDriveToAuto" },
      { from: "set_speed_input", to: "autonomySetSpeed" },
      { from: "delete_all_input", to: "deleteAllWaypoints" },
      { from: "submit_markers_input", to: "submitMarkers" },
      { from: "save_csv_input", to: "saveWaypointsToCSV" }

    ]

  },

  science: {

    nodes: [

      // =====================================================
      // INPUT LAYER (y: 0)
      // =====================================================

      { id: "pump1_input", label: "Pump 1 Start", type: "input", x: -1200, y: 0 },
      { id: "pump2_input", label: "Pump 2 Start", type: "input", x: -900, y: 0 },

      { id: "cache1_open_input", label: "Open Cache 1", type: "input", x: -500, y: 0 },
      { id: "cache1_close_input", label: "Close Cache 1", type: "input", x: -250, y: 0 },
      { id: "cache2_open_input", label: "Open Cache 2", type: "input", x: 0, y: 0 },
      { id: "cache2_close_input", label: "Close Cache 2", type: "input", x: 250, y: 0 },

      { id: "cuvette_rotate_input", label: "Rotate Cuvette", type: "input", x: 600, y: 0 },

      { id: "spectro_collect_input", label: "Collect Spectrometer Data", type: "input", x: 1000, y: 0 },
      { id: "spectro_generate_input", label: "Generate Spectrometer Graph", type: "input", x: 1300, y: 0 },
      { id: "spectro_refresh_input", label: "Refresh Spectrometer Files", type: "input", x: 1600, y: 0 },

      { id: "lightbulb_toggle_input", label: "Toggle Lightbulb", type: "input", x: 1900, y: 0 },
      { id: "u2d2_toggle_input", label: "Toggle U2D2", type: "input", x: 2150, y: 0 },

      { id: "gimbal_picture_input", label: "Take Picture", type: "input", x: 2500, y: 0 },
      { id: "gimbal_pano_input", label: "Make Panorama", type: "input", x: 2750, y: 0 },
      { id: "gimbal_request_input", label: "Request Panorama", type: "input", x: 3000, y: 0 },
      { id: "gimbal_new_folder_input", label: "Create Gimbal Folder", type: "input", x: 3250, y: 0 },


      // =====================================================
      // FUNCTION LAYER (INTERMEDIATE LOGIC) (y: 200)
      // =====================================================

      { id: "pump1_parse", label: "Parse Pump 1 Value", type: "function", x: -1200, y: 200},
      { id: "pump2_parse", label: "Parse Pump 2 Value", type: "function", x: -900, y: 200 },

      { id: "cache1_open_logic", label: "Cache 1 Open Logic", type: "function", x: -500, y: 200, mutates: ["cacheState"] },
      { id: "cache1_close_logic", label: "Cache 1 Close Logic", type: "function", x: -250, y: 200, mutates: ["cacheState"] },
      { id: "cache2_open_logic", label: "Cache 2 Open Logic", type: "function", x: 0, y: 200, mutates: ["cacheState"] },
      { id: "cache2_close_logic", label: "Cache 2 Close Logic", type: "function", x: 250, y: 200, mutates: ["cacheState"] },

      { id: "cuvette_prepare", label: "Prepare Cuvette Command", type: "function", x: 600, y: 200 },

      { id: "spectro_collect_prepare", label: "Prepare Spectrometer Request", type: "function", x: 1000, y: 200 },
      { id: "spectro_generate_prepare", label: "Prepare Spectrometer Graph", type: "function", x: 1300, y: 200, reads: ["selectedSpectrometerFiles"] },

      { id: "relay_lightbulb_logic", label: "Build Lightbulb Relay Message", type: "function", x: 1900, y: 200 },
      { id: "relay_u2d2_logic", label: "Build U2D2 Relay Message", type: "function", x: 2150, y: 200 },

      { id: "gimbal_picture_logic", label: "Prepare Gimbal Picture Command", type: "function", x: 2500, y: 200 },
      { id: "gimbal_pano_logic", label: "Prepare Gimbal Pano Command", type: "function", x: 2750, y: 200 },
      { id: "gimbal_request_logic", label: "Prepare Gimbal Request", type: "function", x: 3000, y: 200 },
      { id: "gimbal_folder_logic", label: "Validate Folder Name", type: "function", x: 3250, y: 200 },


      // =====================================================
      // PUBLISHER LAYER (y: 350)
      // =====================================================

      {
        id: "/pump/milliliters",
        label: "Publish Pump Command",
        type: "publisher",
        x: -1050,
        y: 350,
        messageType: "robot_interfaces/msg/TargetedFloat",
        messageStructure: { data: "float32", target: "int" }
      },

      {
        id: "/cache_closed",
        label: "Publish Cache Command",
        type: "publisher",
        x: -125,
        y: 350,
        messageType: "robot_interfaces/msg/TargetedBool",
        messageStructure: { target: "int", data: "bool" }
      },

      {
        id: "/carousel/curr_cuvette",
        label: "Publish Cuvette Rotation",
        type: "publisher",
        x: 600,
        y: 350,
        messageType: "std_msgs/msg/Int32",
        messageStructure: { data: "int32" }
      },

      {
        id: "/spectrometer/request",
        label: "Publish Spectrometer Request",
        type: "publisher",
        x: 1000,
        y: 350,
        messageType: "std_msgs/msg/Int32",
        messageStructure: { data: "int32" }
      },

      {
        id: "/base_station/spectro_graph_gen",
        label: "Publish Spectrometer Generate",
        type: "publisher",
        x: 1300,
        y: 350,
        messageType: "robot_interfaces/msg/StringArray",
        messageStructure: { data: "string[]" }
      },

      {
        id: "/relay_status",
        label: "Publish Relay Status",
        type: "publisher",
        x: 2050,
        y: 350,
        messageType: "robot_interfaces/msg/STargetedBool",
        messageStructure: { target: "string", data: "bool" }
      },

      {
        id: "/pano",
        label: "Publish Gimbal Picture/Pano",
        type: "publisher",
        x: 2625,
        y: 350,
        messageType: "std_msgs/msg/Int32",
        messageStructure: { data: "int32" }
      },

      {
        id: "/request_image",
        label: "Publish Gimbal Request",
        type: "publisher",
        x: 3000,
        y: 350,
        messageType: "std_msgs/msg/Empty",
        messageStructure: {}
      },

      {
        id: "/new_file",
        label: "Publish New Folder",
        type: "publisher",
        x: 3250,
        y: 350,
        messageType: "std_msgs/msg/String",
        messageStructure: { data: "string" }
      },


      // =====================================================
      // SUBSCRIBER LAYER (y: 550)
      // =====================================================

      { id: "science/temp1", label: "Sensor 1 Temp", type: "subscriber", x: -1200, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["temp1"] },
      { id: "science/pressure1", label: "Sensor 1 Pressure", type: "subscriber", x: -1000, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["press1"] },
      { id: "science/humidity1", label: "Sensor 1 Humidity", type: "subscriber", x: -800, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["hum1"] },

      { id: "science/temp2", label: "Sensor 2 Temp", type: "subscriber", x: -400, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["temp2"] },
      { id: "science/pressure2", label: "Sensor 2 Pressure", type: "subscriber", x: -200, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["press2"] },
      { id: "science/humidity2", label: "Sensor 2 Humidity", type: "subscriber", x: 0, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["hum2"] },

      { id: "/picoTemp", label: "Probe Temperature", type: "subscriber", x: 300, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["probeTemp"] },
      { id: "/picoMoisture", label: "Probe Moisture", type: "subscriber", x: 500, y: 550, messageType: "std_msgs/msg/Float32", messageStructure: { data: "float32" }, mutates: ["probeMoisture"] },

      { id: "/base_station/spectro_graph_list", label: "Spectrometer Folder List", type: "subscriber", x: 1300, y: 550, messageType: "robot_interfaces/msg/StringArray", messageStructure: { data: "string[]" }, mutates: ["spectrometerFiles"] }

    ],

    edges: [
      { from: "pump1_input", to: "pump1_parse" },
      { from: "pump1_parse", to: "/pump/milliliters" },

      { from: "pump2_input", to: "pump2_parse" },
      { from: "pump2_parse", to: "/pump/milliliters" },

      { from: "cache1_open_input", to: "cache1_open_logic" },
      { from: "cache1_open_logic", to: "/cache_closed" },

      { from: "cache1_close_input", to: "cache1_close_logic" },
      { from: "cache1_close_logic", to: "/cache_closed" },

      { from: "cache2_open_input", to: "cache2_open_logic" },
      { from: "cache2_open_logic", to: "/cache_closed" },

      { from: "cache2_close_input", to: "cache2_close_logic" },
      { from: "cache2_close_logic", to: "/cache_closed" },

      { from: "cuvette_rotate_input", to: "cuvette_prepare" },
      { from: "cuvette_prepare", to: "/carousel/curr_cuvette" },

      { from: "spectro_collect_input", to: "spectro_collect_prepare" },
      { from: "spectro_collect_prepare", to: "/spectrometer/request" },

      { from: "spectro_generate_input", to: "spectro_generate_prepare" },
      { from: "spectro_generate_prepare", to: "/base_station/spectro_graph_gen" },

      { from: "lightbulb_toggle_input", to: "relay_lightbulb_logic" },
      { from: "relay_lightbulb_logic", to: "/relay_status" },

      { from: "u2d2_toggle_input", to: "relay_u2d2_logic" },
      { from: "relay_u2d2_logic", to: "/relay_status" },

      { from: "gimbal_picture_input", to: "gimbal_picture_logic" },
      { from: "gimbal_picture_logic", to: "/pano" },

      { from: "gimbal_pano_input", to: "gimbal_pano_logic" },
      { from: "gimbal_pano_logic", to: "/pano" },

      { from: "gimbal_request_input", to: "gimbal_request_logic" },
      { from: "gimbal_request_logic", to: "/request_image" },

      { from: "gimbal_new_folder_input", to: "gimbal_folder_logic" },
      { from: "gimbal_folder_logic", to: "/new_file" }
    ]

  }

};