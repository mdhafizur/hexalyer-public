"""
This script simulates an agent connecting to a Command-and-Control (C2) server.
It sends simulated agent data as JSON over a TCP socket.
"""

import socket
import json

# Define the C2 socket server details
C2_HOST = "127.0.0.1"
C2_PORT = 6003

# Simulate agent data
agent_data = {
    "agent_id": "63A2CE8B-23F0-5179-B0B7-6AFA5D6B8541",
    "client_info": {
        "processid": 27446,
        "ipaddress": "127.0.0.1:27446",
        "netinterfaces": [
            {"name": "lo0", "ips": ["127.0.0.1", "::1", "fe80::1%lo0"]},
            {"name": "en0", "ips": ["192.168.0.100", "fe80::1813:eaba:6de7:fef0%en0"]},
            {"name": "utun4", "ips": ["10.2.1.11"]},
        ],
        "osinfo": {
            "cpus": 8,
            "kernel": "Darwin",
            "core": "24.0.0",
            "platform": "arm64",
            "os": "macOS",
        },
        "codename": "daring-giraffe",
        "hostname": "mbp.local",
        "username": "root",
    },
}

# Create a socket connection to the server
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    try:
        # Connect to the server
        sock.connect((C2_HOST, C2_PORT))
        print(f"Connected to C2 server at {C2_HOST}:{C2_PORT}")

        print(f"Sending data: {json.dumps(agent_data)}")
        # Send the agent data as JSON
        sock.sendall(json.dumps(agent_data).encode("utf-8"))
        print("Data sent to server")

        # Close the connection
        print("Closing connection")
    except (socket.error, json.JSONDecodeError) as e:
        # Catch specific exceptions related to sockets and JSON
        print(f"Error: {e}")
