/**
 * Gizlock — viewer.js
 * Handles everything on page.html:
 *   - Decoding and decompressing the URL fragment (#hash)
 *   - Prompting for a password if the page is protected
 *   - Fetching verified UTC time from NTP-backed servers to enforce time locks
 *   - Decrypting the payload and rendering the article
 *   - Gracefully handling broken image embeds
 *
 * The decryption key is derived entirely from the URL or the user's password.
 * No server is ever contacted for decryption purposes.
 *
 * Made by Şahin Güçlü with ❤️
 * https://github.com/sahinguclu/Gizlock
 */

let encryptedData = null;

// Fetch the real current UTC time from public NTP-backed APIs.
// This prevents time lock bypass by changing the device clock.
// Two sources are tried in order — each has a 4-second timeout.
// If both fail (e.g. user is offline), falls back to local time
// and returns verified: false so a warning can be logged.
async function getVerifiedTime() {
    const sources = [
        async () => {
            const r = await fetch('https://timeapi.io/api/time/current/zone?timeZone=UTC', { cache: 'no-store' });
            const d = await r.json();
            return new Date(d.dateTime + 'Z').getTime();
        },
        async () => {
            const r = await fetch('https://api.coinbase.com/v2/time', { cache: 'no-store' });
            const d = await r.json();
            return d.data.epoch * 1000;
        }
    ];

    for (const source of sources) {
        try {
            const t = await Promise.race([
                source(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
            ]);
            if (typeof t === 'number' && t > 0) return { time: t, verified: true };
        } catch (e) {
            continue;
        }
    }

    return { time: Date.now(), verified: false };
}

window.onload = async () => {
    const hash = window.location.hash.substring(1);

    // If there is no hash at all, this page was opened directly — redirect to editor
    if (!hash) {
        window.location.href = 'index.html';
        return;
    }

    try {
        encryptedData = CryptoUtils.decodeAndDecompressData(hash);
        if (encryptedData.p === 1) {
            document.title = "Page is locked - Gizlock";
            document.getElementById('password-prompt').style.display = 'block';
            document.getElementById('viewer-password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') document.getElementById('unlock-btn').click();
            });
        } else {
            const key = await CryptoUtils.importKey(encryptedData.k);
            await decryptAndRender(key);
        }
    } catch (e) {
        console.error("Link Processing Failed:", e);
        document.body.innerHTML = '<div style="text-align:center; padding:50px; color: var(--red-text);">Link is corrupted or invalid.<br><small style="color: var(--gray);">See browser console for details.</small></div>';
    }
};

document.getElementById('unlock-btn').addEventListener('click', async () => {
    const pwd = document.getElementById('viewer-password').value;
    const errObj = document.getElementById('error-msg');
    if (!pwd) { errObj.innerText = "Enter a password."; return; }
    try {
        const salt = CryptoUtils.b642ab(encryptedData.s);
        const key = await CryptoUtils.deriveKey(pwd, salt);
        await decryptAndRender(key);
    } catch (e) {
        errObj.innerText = "Incorrect password.";
    }
});

async function decryptAndRender(key) {
    try {
        const decryptedStr = await CryptoUtils.decrypt(encryptedData.c, encryptedData.i, key);
        const data = JSON.parse(decryptedStr);

        // Always use network time for lock checks — never trust the device clock
        const { time: now, verified } = await getVerifiedTime();
        const hide = data.ht === true;

        if (!verified && (data.vf || data.vu)) {
            console.warn("Gizlock: Could not reach any time server. Using local clock for time lock checks. Results may be inaccurate if device clock has been tampered with.");
        }

        if (data.vf && now < data.vf) {
            document.getElementById('password-prompt').style.display = 'none';
            document.getElementById('time-lock-message').style.display = 'block';
            document.getElementById('time-lock-title').innerText = "Access Denied";
            document.getElementById('time-lock-desc').innerText = hide
                ? "This page is not yet available."
                : "This page will become available on: " + new Date(data.vf).toLocaleString();
            return;
        }

        if (data.vu && now > data.vu) {
            document.getElementById('password-prompt').style.display = 'none';
            document.getElementById('time-lock-message').style.display = 'block';
            document.getElementById('time-lock-title').innerText = "Link Expired";
            document.getElementById('time-lock-desc').innerText = hide
                ? "This page is no longer available."
                : "This link permanently expired on: " + new Date(data.vu).toLocaleString();
            return;
        }

        document.getElementById('password-prompt').style.display = 'none';
        document.getElementById('time-lock-message').style.display = 'none';

        if (data.title) document.getElementById('display-title').innerText = data.title;
        if (data.author) document.getElementById('display-author').innerText = "By " + data.author;
        document.getElementById('display-body').innerHTML = data.body;
        document.getElementById('content-display').style.display = 'block';
        document.title = (data.title || "Untitled") + " - Gizlock";

        handleViewerBrokenEmbeds();
    } catch (e) {
        console.error("Decryption failed:", e);
        document.getElementById('error-msg').innerText = "Incorrect password or decryption failed.";
    }
}

function handleViewerBrokenEmbeds() {
    document.querySelectorAll('#display-body img').forEach(embed => {
        embed.removeAttribute('onerror');
        embed.addEventListener('error', function() {
            const errorElement = document.createElement('div');
            errorElement.style.cssText = 'background: var(--red-bg); border: 1px solid var(--red-border); color: var(--red-text); padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;';
            errorElement.innerText = 'Embed file unable to load';
            const wrapper = this.closest('.embed-wrapper');
            if (wrapper) wrapper.replaceWith(errorElement);
            else this.replaceWith(errorElement);
        });
    });
}
