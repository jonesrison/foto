# Photobooth Backend

This backend server receives photos from the kiosk frontend, processes them, and handles printing. It also provides a real-time surveillance dashboard.

## Requirements
- Node.js (v16 or newer recommended)

## Setup & Running
1. Open a terminal in this `backend` folder on the second laptop.
2. Run `npm install` to install dependencies (`express`, `cors`, `socket.io`).
3. Run `npm start` to start the server.

## Accessing Surveillance
Open your browser on the laptop running the server and navigate to: 
`http://localhost:3000/surveillance/surveillance.html`

## Important Note for Kiosk Configuration
On the main Photobooth Kiosk laptop, make sure to update the IP addresses in:
- `js/pipeline.js`
- `js/printer.js`

Change `http://127.0.0.1:3000/process` to the actual local IP address of the second laptop (e.g. `http://192.168.1.100:3000/process`).
