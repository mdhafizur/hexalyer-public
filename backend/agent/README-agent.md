curl -o agent.exe http://localhost:5000/web/api/v1/download/agent/windows/677bd83746f19c406ef0d81a/677b9602d17fa84198a9ee3e

Invoke-WebRequest -Uri http://localhost:5000/web/api/v1/download/agent/windows/677bd83746f19c406ef0d81a/677b9602d17fa84198a9ee3e -OutFile agent.exe

.\agent.exe


linux

curl -o agent http://localhost:5000/web/api/v1/download/agent/linux/677bd83746f19c406ef0d81a/677b9602d17fa84198a9ee3e

wget -O agent http://localhost:5000/web/api/v1/download/agent/linux/677bd83746f19c406ef0d81a/677b9602d17fa84198a9ee3e


chmod +x agent

./agent
