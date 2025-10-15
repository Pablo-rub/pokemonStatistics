#!/bin/bash

# Test script for Linux/Mac
# Usage: ./test-replay.sh <replay-id> [debug]

if [ -z "$1" ]; then
    echo "Usage: ./test-replay.sh <replay-id> [debug]"
    echo "Example: ./test-replay.sh gen9vgc2025regh-2462071398"
    echo "Example with debug: ./test-replay.sh gen9vgc2025regh-2462071398 debug"
    exit 1
fi

if [ "$2" = "debug" ]; then
    export LOG_LEVEL=DEBUG
else
    export LOG_LEVEL=INFO
fi

echo "Testing replay: $1"
echo "Log level: $LOG_LEVEL"
echo ""

node test-single-replay.js "$1"