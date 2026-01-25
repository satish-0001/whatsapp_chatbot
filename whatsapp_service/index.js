const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require("socket.io");
const http = require('http');

const PORT = 3000;
const app = http.createServer();
const io = new Server(app, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log('Initializing WhatsApp Client...');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

let currentQR = null;

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // 1. Send immediate status
    if (client.info && client.info.wid) {
        socket.emit('status', { status: 'CONNECTED', user: client.info.wid.user });
    } else if (currentQR) {
        socket.emit('status', { status: 'QR_READY', qr: currentQR });
    } else {
        socket.emit('status', { status: 'INITIALIZING' });
    }

    // 2. Fetch Chats (Groups + Contacts)
    socket.on('fetch_chats', async () => {
        if (!client.info) return; // Not connected
        try {
            const chats = await client.getChats();
            const formattedChats = chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name || chat.id.user,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                lastMessage: chat.lastMessage ? chat.lastMessage.body : ''
            }));
            socket.emit('chats_list', formattedChats);
        } catch (e) {
            console.error('Error fetching chats:', e);
        }
    });

    // 3. Fetch Messages for a specific Chat
    socket.on('fetch_messages', async (chatId) => {
        if (!client.info) return;
        try {
            const chat = await client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: 50 });
            const formattedMessages = messages.map(msg => ({
                id: msg.id._serialized,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                author: msg.author || msg.from,
                pushname: msg._data.notifyName || '',
                ack: msg.ack
            }));
            socket.emit('chat_history', { chatId, messages: formattedMessages });
        } catch (e) {
            console.error('Error fetching messages:', e);
        }
    });

    // 4. Send Message
    socket.on('send_message', async (data) => {
        if (!client.info) return;
        try {
            console.log('Received send_message request:', data);
            let { chatId, message } = data;

            // Auto-format simple numbers to WhatsApp ID
            if (chatId && !chatId.includes('@')) {
                chatId = chatId + '@c.us';
            }

            console.log(`Attempting to send to ${chatId}`);

            // Use getChatById first to ensure valid chat
            const chat = await client.getChatById(chatId);
            await chat.sendMessage(message);

            console.log('Message sent successfully to', chatId);
        } catch (e) {
            console.error('Error sending message:', e);
            socket.emit('message_error', {
                error: e.message || 'Failed to send',
                chatId: data.chatId
            });
        }
    });

    // 5. Logout
    socket.on('logout', async () => {
        console.log('Logout requested');
        try {
            await client.logout();
            currentQR = null;
            io.emit('status', { status: 'DISCONNECTED' });
        } catch (e) {
            console.error('Logout failed', e);
        }
    });
});

// WhatsApp Client Events
client.on('qr', (qr) => {
    console.log('QR Code received');
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generating QR', err);
            return;
        }
        currentQR = url;
        io.emit('status', { status: 'QR_READY', qr: url });
    });
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    currentQR = null;
    io.emit('status', { status: 'CONNECTED', user: client.info.wid.user });
});

client.on('authenticated', () => {
    console.log('Authenticated');
    io.emit('status', { status: 'AUTHENTICATED' });
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    io.emit('status', { status: 'AUTH_FAILURE', message: msg });
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    currentQR = null;
    io.emit('status', { status: 'DISCONNECTED', reason: reason });
    client.initialize();
});

// Relaying Messages
client.on('message_create', (msg) => {
    const remoteId = msg.id.remote;
    io.emit('new_message', {
        chatId: remoteId,
        messageId: msg.id._serialized,
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
        pushname: msg._data.notifyName || '',
        author: msg.author || msg.from,
        ack: msg.ack
    });
});

// Message Status Updates (Ticks)
client.on('message_ack', (msg, ack) => {
    // console.log('Message ACK:', msg.id._serialized, ack);
    io.emit('message_status', {
        messageId: msg.id._serialized,
        ack: ack,
        chatId: msg.id.remote
    });
});

// Handle Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('(SIGINT) Shutting down...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('(SIGTERM) Shutting down...');
    await client.destroy();
    process.exit(0);
});

client.initialize();

app.listen(PORT, () => {
    console.log(`Socket Server running on port ${PORT}`);
});
