/**
 * Gizlock — editor.js
 * Handles everything on index.html:
 *   - Password and time-lock setting toggles
 *   - Image embed modal (with URL validation and cursor fix)
 *   - Auto-linking of pasted https:// URLs
 *   - Collecting the article, encrypting it, and building the final URL
 *
 * The encryption itself is delegated entirely to crypto.js.
 * This file never sends or receives any data over the network.
 *
 * Made by Şahin Güçlü with ❤️
 * https://github.com/sahinguclu/Gizlock
 */

document.addEventListener("DOMContentLoaded", () => {

    // --- Password toggle ---
    // Show/hide the password input when the checkbox is ticked.
    // Also clears the field if the user unticks it so it can't silently encrypt.
    const usePassword = document.getElementById('use-password');
    const passwordInput = document.getElementById('password-input');
    usePassword.addEventListener('change', () => {
        passwordInput.style.display = usePassword.checked ? 'block' : 'none';
        if (!usePassword.checked) passwordInput.value = '';
    });

    // --- Time lock toggles ---
    // Valid From and Valid Until datetime pickers are hidden by default.
    // They only appear when the matching checkbox is ticked.
    // "Hide times" only becomes available once at least one time limit is active.
    const enableFrom = document.getElementById('enable-from');
    const enableUntil = document.getElementById('enable-until');
    const validFromInput = document.getElementById('valid-from');
    const validUntilInput = document.getElementById('valid-until');
    const hideTimesGroup = document.getElementById('hide-times-group');
    const hideTimes = document.getElementById('hide-times');

    function updateTimeSettings() {
        validFromInput.style.display = enableFrom.checked ? 'block' : 'none';
        validUntilInput.style.display = enableUntil.checked ? 'block' : 'none';
        if (enableFrom.checked || enableUntil.checked) {
            hideTimesGroup.style.display = 'flex';
        } else {
            hideTimesGroup.style.display = 'none';
            hideTimes.checked = false;
        }
    }

    enableFrom.addEventListener('change', updateTimeSettings);
    enableUntil.addEventListener('change', updateTimeSettings);
});

// --- Image embed modal ---

function openModal() {
    document.getElementById('image-url-input').value = '';
    document.getElementById('modal-error').innerText = '';
    document.body.style.overflow = 'hidden'; // Lock page scroll while modal is open
    document.getElementById('image-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('image-url-input').focus(), 50);
}

function closeModal() {
    document.body.style.overflow = '';
    document.getElementById('image-modal').style.display = 'none';
}

// Called by the onerror attribute on embedded <img> tags inside the editor.
// Replaces the broken image with a visible error block so the user knows
// the link they pasted doesn't work before they even publish.
window.handleEditorImageError = function(imgElement) {
    const wrapper = imgElement.closest('.embed-wrapper');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'editor-broken-link';
    errorDiv.style.cssText = 'background: #f8f9fa; border: 1px dashed #ccc; padding: 20px; text-align: center; color: #666; border-radius: 6px; margin: 20px 0;';
    errorDiv.innerText = 'File you have embedded is not working';
    if (wrapper) {
        wrapper.replaceWith(errorDiv);
    } else {
        imgElement.replaceWith(errorDiv);
    }
};

function insertImage() {
    const url = document.getElementById('image-url-input').value.trim();
    const errorEl = document.getElementById('modal-error');

    if (!url) { errorEl.innerText = "Please enter a URL."; return; }

    // Validate it is a real URL before touching the DOM
    try {
        new URL(url);
    } catch(e) {
        errorEl.innerText = "Please enter a valid URL (must start with https://).";
        return;
    }

    // Only allow direct image file links — no video, no PDF
    const path = url.split('?')[0].toLowerCase();
    const validExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.webp', '.avif', '.apng'];
    if (!validExtensions.some(ext => path.endsWith(ext))) {
        errorEl.innerText = "Invalid format. Must end with a supported image extension (.jpg, .png, .gif, .svg, .webp, .avif, .apng).";
        return;
    }

    closeModal();

    // The embed wrapper is contenteditable="false" so the user can't accidentally
    // type inside the image block. The X button removes the whole wrapper.
    // cursor-target is a temporary paragraph injected below the image so the
    // browser cursor lands there instead of getting trapped inside the wrapper.
    const embedHTML = `
        <div class="embed-wrapper" contenteditable="false" style="position:relative; display:inline-block; margin:20px 0; max-width:100%;">
            <img src="${url}" style="max-width:100%; border-radius:6px; display:block;" onerror="window.handleEditorImageError(this)">
            <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:white; border:1px solid rgba(255,255,255,0.3); border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold;">X</button>
        </div><p id="cursor-target"><br></p>`;

    document.getElementById('editor').focus();
    document.execCommand('insertHTML', false, embedHTML);

    // Force the cursor to the paragraph below the image
    const target = document.getElementById('cursor-target');
    if (target) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(target, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        target.removeAttribute('id'); // Clean up the temporary marker
    }
}

// --- Auto-linking ---
// Walks every text node in the editor HTML and wraps bare https:// URLs
// in <a> tags so they become clickable on the published page.
// Skips text nodes that are already inside an anchor tag.
function linkifyContent(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    let node;
    const urlRegex = /(https?:\/\/[^\s<]+)/g;

    while ((node = walker.nextNode())) {
        if (node.parentNode.tagName === 'A') continue;
        if (urlRegex.test(node.nodeValue)) nodesToReplace.push(node);
    }

    nodesToReplace.forEach(textNode => {
        const span = document.createElement('span');
        span.innerHTML = textNode.nodeValue.replace(urlRegex, '<a href="$1" target="_blank" style="text-decoration: underline;">$1</a>');
        textNode.parentNode.replaceChild(span, textNode);
    });

    return tempDiv.innerHTML;
}

// --- Publish / encrypt ---
document.getElementById('publish-btn').addEventListener('click', async () => {
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    let rawBody = document.getElementById('editor').innerHTML;

    // Reject publishing if both title and visible text content are empty
    const textContentOnly = document.getElementById('editor').innerText.trim();
    if (!title && !textContentOnly) {
        alert("Please write something or add a title before publishing!");
        return;
    }

    // Clean up the DOM before encrypting:
    // - linkify bare URLs
    // - strip the X buttons from image wrappers (viewers don't need them)
    const cleanDOM = document.createElement('div');
    cleanDOM.innerHTML = linkifyContent(rawBody);
    cleanDOM.querySelectorAll('.embed-wrapper button').forEach(btn => btn.remove());

    // Read time lock settings — only use values if the checkbox is actually ticked
    const enableFrom = document.getElementById('enable-from').checked;
    const validFromInput = document.getElementById('valid-from').value;
    const enableUntil = document.getElementById('enable-until').checked;
    const validUntilInput = document.getElementById('valid-until').value;
    const tFrom = enableFrom && validFromInput ? validFromInput : null;
    const tUntil = enableUntil && validUntilInput ? validUntilInput : null;
    const hideT = document.getElementById('hide-times').checked;

    // Build the payload — this is what gets encrypted into the URL
    const payloadObj = {
        title,
        author,
        body: cleanDOM.innerHTML,
        vf: tFrom ? new Date(tFrom).getTime() : null, // Valid From timestamp (ms)
        vu: tUntil ? new Date(tUntil).getTime() : null, // Valid Until timestamp (ms)
        ht: hideT // Hide exact times from viewer
    };

    const payload = JSON.stringify(payloadObj);
    const usePassword = document.getElementById('use-password').checked;
    const password = document.getElementById('password-input').value;
    let urlData = { p: usePassword ? 1 : 0 };
    let key;

    try {
        if (usePassword) {
            if (!password) { alert("Please enter a password."); return; }
            // Password path: derive key from password + random salt.
            // The salt is stored in the URL; the password is NOT.
            const salt = crypto.getRandomValues(new Uint8Array(16));
            urlData.s = CryptoUtils.ab2b64(salt);
            key = await CryptoUtils.deriveKey(password, salt);
        } else {
            // No-password path: generate a random key and embed it in the URL.
            // Anyone with the link can read the page.
            key = await CryptoUtils.generateKey();
            urlData.k = await CryptoUtils.exportKey(key);
        }

        const encrypted = await CryptoUtils.encrypt(payload, key);
        urlData.i = encrypted.iv;
        urlData.c = encrypted.cipher;

        // Compress + encode the entire urlData object into a URL-safe string
        const shortEncodedHash = CryptoUtils.compressAndEncodeData(urlData);
        const baseUrl = window.location.href.replace('index.html', '').split('#')[0];
        const finalUrl = `${baseUrl}page.html#${shortEncodedHash}`;

        document.getElementById('generated-link').value = finalUrl;
        document.getElementById('result-section').style.display = 'block';
        document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error("Gizlock: Encryption failed.", e);
        alert("Encryption failed. Error: " + (e.message || "Check the browser console for details."));
    }
});

function copyLink() {
    const linkInput = document.getElementById('generated-link');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Required for mobile browsers
    try {
        document.execCommand('copy');
        alert("Link copied successfully!");
    } catch (err) {
        alert("Failed to copy automatically. Please select the link and copy manually.");
    }
}
