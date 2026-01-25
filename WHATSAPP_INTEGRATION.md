# WhatsApp Integration Guide (Nexovate)

## 1. Architecture Overview
To achieve functionality similar to `web.whatsapp.com` within Frappe, we use a **Node.js Bridge**.
Frappe (Python) cannot natively run the WhatsApp Web protocol (which heavily relies on JavaScript/Browser tech).

**Structure:**
*   **Frappe App**: Handles the UI, database, and business logic.
*   **Node.js Service**: Runs `whatsapp-web.js` (a library that runs a headless WhatsApp Web instance). It handles QR generation, authentication, and message sending/receiving.
*   **Socket.io**: Used for real-time communication between the Node.js service and the Frappe Frontend (to show QR code and status updates instantly).

## 2. How it Works

### QR Code Generation
1.  The Node.js service starts a headless browser (Puppeteer).
2.  It navigates to `web.whatsapp.com` internally.
3.  WhatsApp Web generates a QR code.
4.  The library intercepts this QR code string.
5.  Node.js emits this QR code (as a base64 image) via Socket.io to your Frappe frontend.
6.  The user scans it with their phone.

### Session Handling
*   **Persistence**: We use `LocalAuth` strategy. This saves the session tokens (in a folder like `.wwebjs_auth`) so the user doesn't need to scan the QR code every time the server restarts.
*   **Reconnection**: The library automatically handles reconnection if the internet drops.
*   **Logout**: When you click "Logout" in Frappe, we send a command to the Node service to `client.logout()`, which clears the session files.

### Active Connection Detection
*   The Node.js client listens for events like `ready`, `authenticated`, and `disconnected`.
*   When the phone connects, the status changes to `CONNECTED`.
*   This status is pushed to Frappe/Redis to show the "Active" badge in the UI.

## 3. Security Best Practices
*   **Local Network**: Ensure the Socket.io port (e.g., 3000) is only accessible internally or significantly restricted.
*   **Session Files**: Keep the auth folder (`.wwebjs_auth`) outside the public web directory to prevent anyone from downloading session tokens.
*   **HTTPS**: Use Nginx to proxy the Socket.io connection securely (WSS) in production.

## 4. Required Configuration
You will need:
1.  **Node.js** installed on the server (Verify with `node -v`).
2.  **Dependencies**: `whatsapp-web.js`, `socket.io`, `qrcode`.
3.  **Process Manager**: Use `pm2` or `supervisor` to keep the Node.js service running active in the background.

## 5. Implementation Status & Usage
✅ **Implemented Features:**
*   Node.js Service created in `whatsapp_service/`
*   Frappe Page created at `whats_app_chatbot/page/whatsapp-manager`
*   Socket.io client bundled.

### How to Run
1.  **Register the Page**:
    ```bash
    bench migrate
    ```

2.  **Start the WhatsApp Service**:
    Open a terminal in the app directory and run:
    ```bash
    ./start_whatsapp.sh
    ```
    This will start the Node.js server on port 3000.

3.  **Scan QR Code**:
    *   Log in to ERPNext/Frappe.
    *   Go to **WhatsApp Manager** (search in Awesome Bar).
    *   Scan the QR code with your phone (WhatsApp -> Linked Devices).

4.  **Status**:
    Once connected, the page will show "Active" and your phone number. The session is saved locally in `whatsapp_service/.wwebjs_auth`.
