frappe.pages['whatsapp-manager'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'WhatsApp Manager',
        single_column: true
    });

    // Load Socket.io Client from local assets
    frappe.require('/assets/whats_app_chatbot/js/socket.io.min.js', function () {
        init_whatsapp_ui(page);
    });
}

function init_whatsapp_ui(page) {
    const $container = $(`<div class="whatsapp-container">
        <div class="status-section">
            <div id="status-badge" class="indicator red">Disconnected</div>
            <div id="status-message">Connecting to service...</div>
        </div>
        
        <div id="qr-wrapper" class="qr-box">
            <div id="qr-placeholder">
                <div class="spinner-border text-secondary" role="status"></div>
                <p>Waiting for QR Code...</p>
            </div>
            <img id="qr-image" />
        </div>

        <div id="user-info" class="user-box">
            <div class="success-icon">✅</div>
            <h3>Connected to WhatsApp</h3>
            <p id="whatsapp-number"></p>
            <button class="btn btn-danger btn-sm" id="btn-logout">Logout / Disconnect</button>
        </div>
        
        <div class="instructions">
            <h4>Instructions</h4>
            <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu or Settings and select <b>Linked Devices</b></li>
                <li>Tap on <b>Link a Device</b></li>
                <li>Point your phone to this screen to capture the code</li>
            </ol>
        </div>
    </div>`).appendTo(page.main);

    // Initial Styles (Inline for simplicity, can be moved to .css)
    const style = `
        <style>
            .whatsapp-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                background: var(--card-bg, #fff);
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .qr-box {
                margin: 30px 0;
                border: 2px dashed var(--border-color, #ddd);
                padding: 20px;
                border-radius: 10px;
                width: 300px;
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f9f9f9;
            }
            #qr-image {
                width: 100%;
                height: 100%;
                display: none;
            }
            .user-box {
                display: none;
                text-align: center;
                padding: 30px;
                background: #f0fff4;
                border-radius: 8px;
                width: 100%;
            }
            .success-icon {
                font-size: 40px;
                margin-bottom: 10px;
            }
            .instructions {
                margin-top: 40px;
                color: #666;
                text-align: left;
                width: 100%;
            }
            .instructions ol {
                padding-left: 20px;
            }
            .instructions li {
                margin-bottom: 8px;
            }
        </style>
    `;
    $(style).appendTo(page.main);

    // Dynamic Connection URL
    // Connection to port 3000 on the same hostname
    const socketUrl = 'http://' + window.location.hostname + ':3000';
    console.log('Connecting to Socket.io at:', socketUrl);

    const socket = io(socketUrl);

    socket.on('connect', () => {
        console.log('Connected to Node Service');
        $('#status-badge').removeClass().addClass('indicator orange').text('Service Connected');
        $('#status-message').text('Waiting for WhatsApp client...');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Node Service');
        update_ui({ status: 'DISCONNECTED', reason: 'Service Unavailable' });
    });

    socket.on('status', (data) => {
        console.log('Status Update:', data);
        update_ui(data);
    });

    page.element.find('#btn-logout').on('click', () => {
        frappe.confirm('Are you sure you want to disconnect this session?', () => {
            socket.emit('logout');
        });
    });

    function update_ui(data) {
        const $badge = $('#status-badge');
        const $msg = $('#status-message');
        const $qrWrapper = $('#qr-wrapper');
        const $qrImg = $('#qr-image');
        const $placeholder = $('#qr-placeholder');
        const $userInfo = $('#user-info');

        switch (data.status) {
            case 'CONNECTED':
                $badge.removeClass().addClass('indicator green').text('Active');
                $msg.text('WhatsApp is connected and ready.');
                $qrWrapper.hide();
                $userInfo.show();
                $('.instructions').hide();
                $('#whatsapp-number').text(data.user ? `User: ${data.user}` : 'Device Connected');
                break;

            case 'QR_READY':
                $badge.removeClass().addClass('indicator orange').text('Scan QR');
                $msg.text('Please scan the QR code to login.');
                $qrWrapper.show();
                $userInfo.hide();
                $('.instructions').show();

                $placeholder.hide();
                if (data.qr) {
                    $qrImg.attr('src', data.qr).show();
                }
                break;

            case 'AUTHENTICATED':
                $badge.removeClass().addClass('indicator blue').text('Msg Authenticated');
                $msg.text('Restoring session...');
                break;

            case 'DISCONNECTED':
                $badge.removeClass().addClass('indicator red').text('Disconnected');
                $msg.text(data.reason || 'Session ended. Waiting for new QR...');
                $qrWrapper.show();
                $userInfo.hide();
                $('.instructions').show();
                $placeholder.show();
                $qrImg.hide();
                break;

            case 'INITIALIZING':
                $badge.removeClass().addClass('indicator blue').text('Initializing');
                $msg.text('Starting WhatsApp Client...');
                break;

            default:
                $badge.removeClass().addClass('indicator gray').text(data.status);
        }
    }
}
