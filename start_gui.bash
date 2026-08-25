#!/bin/bash

# set -e

source ~/workspace-newrobot2026/install/setup.bash 

(ros2 launch rosbridge_server rosbridge_websocket_launch.xml) &

sleep 2

echo "Installing dependencies..."
(npm install) &

echo "Starting the webpage..."
(npm start) &

echo "Starting map Server..."
(npx http-server ./src/components/Map/ --cors)
