// OSAC UI Common JavaScript

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
}

// Simple navigation handling
function navigate(page) {
    window.location.href = page;
}

// Show alert for unimplemented features
function showNotImplemented(feature) {
    alert(`${feature} - This is a mockup. Feature not implemented.`);
}

// Format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Simple modal handling
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 8px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `;

    modalContent.innerHTML = `
        <h2 style="margin: 0 0 16px 0;">${title}</h2>
        <div>${content}</div>
        <button onclick="this.parentElement.parentElement.remove()"
                class="pf-v5-c-button pf-m-primary"
                style="margin-top: 24px;">Close</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// Confirm dialog
function confirm Dialog(message, callback) {
    if (confirm(message)) {
        callback();
    }
}
