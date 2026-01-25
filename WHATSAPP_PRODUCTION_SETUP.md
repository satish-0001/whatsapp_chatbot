# Production Setup Guide for WhatsApp Service

Since `bench` manages your processes, the recommended way to keep your WhatsApp service running 24/7 is to add it to the supervisor configuration or use a process manager like PM2.

## Option 1: Using Supervisor (Standard Frappe Way)

This method integrates with the standard Frappe stack.

1.  **Create a Supervisor Configuration File**
    Create a file named `whatsapp.conf` in your supervisor config directory (usually `/etc/supervisor/conf.d/` or similar). You might need sudo access.

    ```ini
    [program:whatsapp-node-service]
    command=/usr/bin/node /home/satish/bench/frappe-bench/apps/whats_app_chatbot/whatsapp_service/index.js
    directory=/home/satish/bench/frappe-bench/apps/whats_app_chatbot/whatsapp_service
    user=satish
    autostart=true
    autorestart=true
    redirect_stderr=true
    stdout_logfile=/home/satish/bench/frappe-bench/logs/whatsapp-node.log
    ```

    *Note: Check the path to your `node` binary using `which node`. Replace `/usr/bin/node` if it's different.*

2.  **Reload Supervisor**
    Run the following commands to read the new configuration and start the service:

    ```bash
    sudo supervisorctl reread
    sudo supervisorctl update
    ```

3.  **Check Status**
    ```bash
    sudo supervisorctl status whatsapp-node-service
    ```

---

## Option 2: Using PM2 (Easier for Node.js)

If you don't want to touch `supervisor`, you can use `pm2`, a popular process manager for Node.js.

1.  **Install PM2** (if not installed)
    ```bash
    npm install pm2 -g
    ```

2.  **Start the Service**
    Go to your service directory and start it:

    ```bash
    cd /home/satish/bench/frappe-bench/apps/whats_app_chatbot/whatsapp_service
    pm2 start index.js --name "whatsapp-service"
    ```

3.  **Save the List**
    To ensure it restarts on reboot:

    ```bash
    pm2 save
    pm2 startup
    ```
    *(Follow the instructions printed by the `startup` command)*

## Troubleshooting

-   **Check Logs**: If it doesn't work, check the logs:
    -   Supervisor: `tail -f /home/satish/bench/frappe-bench/logs/whatsapp-node.log`
    -   PM2: `pm2 logs whatsapp-service`
-   **Port Conflicts**: Ensure no other process is using port **3000**.
