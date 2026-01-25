
// WhatsApp Global Integration
// Injected into every page via app_include_js

$(document).ready(function () {
    console.log("WhatsApp Integration: Script Loaded via app_include_js");

    // Polling mechanism to find the Navbar
    // Frappe V15 renders navbar slightly later or uses different classes
    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)

    const checkNavbar = setInterval(() => {
        attempts++;
        let $navbar = null;

        // Strategy 1: Standard Bootstrap Right Nav (V13/V14)
        if ($('.navbar-collapse .navbar-nav.navbar-right').length > 0) {
            $navbar = $('.navbar-collapse .navbar-nav.navbar-right');
        }
        // Strategy 2: Frappe V15 (Often the last nav inside the header)
        else if ($('header.navbar .navbar-nav').last().length > 0) {
            $navbar = $('header.navbar .navbar-nav').last();
        }
        // Strategy 3: Generic Right Nav
        else if ($('.navbar-right').length > 0) {
            $navbar = $('.navbar-right');
        }

        if ($navbar && $navbar.length > 0) {
            clearInterval(checkNavbar);
            console.log("WhatsApp Integration: Navbar found!", $navbar);
            inject_whatsapp_icon($navbar);
        } else {
            console.log("WhatsApp Integration: Navbar check attempt " + attempts);
            if (attempts >= maxAttempts) {
                console.warn("WhatsApp Integration: Could not find navbar after 10 seconds. Injecting Floating Button.");
                clearInterval(checkNavbar);
                inject_floating_button();
            }
        }
    }, 500);
});

function inject_floating_button() {
    // Fallback: A floating button in bottom right
    if ($('#whatsapp-fab').length > 0) return;

    const $fab = $(`
        <div id="whatsapp-fab" title="WhatsApp Connected" style="
            position: fixed; 
            bottom: 20px; 
            right: 20px; 
            width: 50px; 
            height: 50px; 
            background: #fff; 
            border-radius: 50%; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.2); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            cursor: pointer; 
            z-index: 9999;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-message-circle" style="color: #28a745;">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span class="indicator-dot green" style="
                position: absolute; top: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; background: #28a745; border: 2px solid #fff;"></span>
        </div>
     `);

    $('body').append($fab);

    $fab.on('click', function () {
        frappe.set_route('whatsapp-manager');
    });

    // Initialize socket even for FAB
    if (typeof io === 'undefined') {
        frappe.require('/assets/whats_app_chatbot/js/socket.io.min.js', function () {
            init_whatsapp_socket();
        });
    } else {
        init_whatsapp_socket();
    }
}

function inject_whatsapp_icon($navbar) {
    // Avoid duplicate
    if ($('#whatsapp-status-icon').length > 0) return;

    // Create the icon element
    // We use SVG to ensure it displays even if FontAwesome is missing or version-mismatched
    const $li = $(`
        <li class="nav-item" id="whatsapp-status-icon" title="WhatsApp Status: Connecting..." data-toggle="tooltip" data-placement="bottom">
            <a class="nav-link" href="#" onclick="return false;" style="position: relative; padding-top: 14px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-message-circle" style="color: #8d99a6;">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span class="indicator-dot red"></span>
            </a>
        </li>
    `);

    // Add CSS for the dot and positioning
    $('head').append(`
        <style>
            #whatsapp-status-icon .indicator-dot {
                position: absolute;
                bottom: 8px;
                right: 8px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #dc3545; /* Red */
                border: 1px solid var(--navbar-bg, #fff);
                transition: background-color 0.3s ease;
            }
            #whatsapp-status-icon .indicator-dot.green { background-color: #28a745; }
            #whatsapp-status-icon .indicator-dot.orange { background-color: #ffc107; }
            
            /* Alignment fixes for V15 */
            header .navbar-nav #whatsapp-status-icon a.nav-link {
                display: flex;
                align-items: center;
                height: 100%;
            }
        </style>
    `);

    // Prepend to the found navbar so it appears on the left of the user menu
    $navbar.prepend($li);

    // Click event to go to manager
    $li.find('a').on('click', function () {
        if (frappe.get_route()[0] !== 'whatsapp-manager') {
            frappe.set_route('whatsapp-manager');
        }
    });

    // Initialize Connection to Port 3000
    if (typeof io === 'undefined') {
        frappe.require('/assets/whats_app_chatbot/js/socket.io.min.js', function () {
            init_whatsapp_socket();
        });
    } else {
        init_whatsapp_socket();
    }
}

function init_whatsapp_socket() {
    console.log('Initializing WhatsApp Global Socket...');
    const socketUrl = 'http://' + window.location.hostname + ':3000';

    // We use a separate connection for the WhatsApp service
    const socket = io(socketUrl);

    socket.on('connect', () => {
        console.log('Global: Connected to WhatsApp Service');
        update_icon('orange', 'Service Connected');
    });

    socket.on('disconnect', () => {
        console.log('Global: Disconnected from WhatsApp Service');
        update_icon('red', 'Service Disconnected - Check Server');
    });

    socket.on('status', (data) => {
        // console.log('Global Status:', data.status);
        if (data.status === 'CONNECTED') {
            update_icon('green', `WhatsApp Active: ${data.user || 'Connected'}`);
        } else if (data.status === 'QR_READY') {
            update_icon('orange', 'WhatsApp: Waiting for Scan');
            window.whatsapp_connected_notified = false;
        } else {
            update_icon('red', 'WhatsApp Disconnected');
            window.whatsapp_connected_notified = false;
        }
    });
}

function update_icon(color, title) {
    const $icon = $('#whatsapp-status-icon');
    $icon.attr('title', title);
    $icon.attr('data-original-title', title); // For Bootstrap tooltip

    // Update Icon Color
    const $svg = $icon.find('svg');
    if (color === 'green') {
        $svg.css('color', '#28a745');
    } else {
        $svg.css('color', '#8d99a6');
    }

    $icon.find('.indicator-dot').removeClass('red green orange').addClass(color);
}
