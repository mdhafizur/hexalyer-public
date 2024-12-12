
3. Run the Script as a Module
$ python3 -m agent.agent


Download and Run the Linux Agent
# Download the Linux agent
curl -X GET http://<server_address>/download-agent/linux -o agent

# Make the agent executable
chmod +x agent

# Run the Linux agent with the required parameters
./agent <C2_URL> <SOCKET_URL>



Download and Run the Windows Agent
# Download the Windows agent (replace <server_address> with your server's address)
curl -X GET http://<server_address>/download-agent/windows -o agent.exe

# Run the Windows agent with the required parameters
agent.exe <C2_URL> <SOCKET_URL>

Replace <server_address> with the URL of your FastAPI server, and <C2_URL> and <SOCKET_URL> with the actual Command and Control server and Socket.IO server URLs.
Let me know if you need further assistance!