# 📸 Retro Booth

Retro Booth is a modern, feature-rich photobooth application built with web technologies. It is divided into two main components:
1. **Frontend Kiosk**: A sleek, full-screen UI where guests can take 4 photos, choose a retro layout (like Checkered Grey or Vintage Polka Dot), and see their finished photo strip.
2. **Backend & Surveillance UI**: A local server that automatically archives high-quality original photos and strips. It also features a "Surveillance Dashboard" that operators can use to monitor incoming photos, select multiple strips, and bulk print them dynamically onto a single sheet of photo paper!

---

## 🛠️ Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your computer. 

---

## 🚀 How to Run the App

You need to run **both** the backend and the frontend simultaneously in two separate terminal windows.

### 1. Start the Backend
The backend handles saving your photos to the `backend/photos/` folder and serves the operator Surveillance Dashboard.

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies (only needed the first time):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
*The backend will now be running on `http://localhost:3000`.*

### 2. Start the Frontend Kiosk
The frontend is the guest-facing camera app. 

1. Open a **new** terminal window and navigate to the main project folder (`foto`):
   ```bash
   cd path/to/foto
   ```
2. Serve the frontend using `serve`:
   ```bash
   npx serve .
   ```
*The terminal will output a local URL (e.g., `http://localhost:60870`). Open that URL in Chrome to see the Kiosk!*

---

## 🔗 Connecting the Kiosk to the Backend

1. When you open the frontend Kiosk for the first time, click the hidden **Settings** button in the top left corner.
2. In the Admin settings, navigate to the **Connection Info** page.
3. Select your backend IP address from the dropdown (you can select `localhost:3000` if you are running everything on the same laptop).
4. Click **Save & Test**. The Kiosk is now linked to the backend!

---

## 🖨️ How to Bulk Print

1. Keep your Kiosk running for guests.
2. Open the **Surveillance Dashboard** in a new browser tab:
   👉 `http://localhost:3000/surveillance/surveillance.html`
3. As guests take photos, their strips will appear here live.
4. Click on any photo strip to select it (it will light up green). 
5. Click **Print Selected** at the top. The app will automatically stack and rotate the strips to perfectly fit a standard photo paper layout and open your system's print dialog!
