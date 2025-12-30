#!/bin/bash

# Start Xvfb in the background
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

# Start the application
npm start
