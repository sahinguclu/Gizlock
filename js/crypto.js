/**
 * Gizlock — crypto.js
 * All encryption and decryption logic lives here.
 *
 * Algorithm : AES-GCM 256-bit (Web Crypto API)
 * Key derivation : PBKDF2 + SHA-256, 100,000 iterations (password-protected links)
 * Random key : 256-bit via crypto.getRandomValues (password-free links)
 * Compression : LZString (loaded via lz-string.js) shrinks the URL payload
 *               before encryption, sometimes cutting link length by 50%+.
 *
 * Nothing in this file ever touches a network or a server.
 * Every operation is sandboxed entirely inside the user's browser.
 *
 * Made by Şahin Güçlü with ❤️
 * https://github.com/sahinguclu/Gizlock
 */

const CryptoUtils = {

    // Generate a fresh random AES-GCM 256-bit key (used when no password is set)
    async generateKey() {
        return await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Derive a deterministic key from a password + random salt using PBKDF2.
    // 100,000 iterations makes brute-force attacks expensive.
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Export a CryptoKey to a Base64 string so it can be embedded in the URL
    async exportKey(key) {
        const exported = await crypto.subtle.exportKey("raw", key);
        return this.ab2b64(exported);
    },

    // Import a Base64 string back into a CryptoKey for decryption
    async importKey(keyStr) {
        const keyBuffer = this.b642ab(keyStr);
        return await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // Encrypt a plaintext string. Returns { iv, cipher } both as Base64.
    // A fresh random 96-bit IV is generated for every encryption — never reused.
    async encrypt(text, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(text)
        );
        return {
            iv: this.ab2b64(iv),
            cipher: this.ab2b64(ciphertext)
        };
    },

    // Decrypt a Base64 cipher + IV back to plaintext
    async decrypt(cipherStr, ivStr, key) {
        const iv = this.b642ab(ivStr);
        const ciphertext = this.b642ab(cipherStr);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        const dec = new TextDecoder();
        return dec.decode(decrypted);
    },

    // ArrayBuffer → Base64 string
    ab2b64(buf) {
        let binary = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // Base64 string → ArrayBuffer
    b642ab(base64) {
        const binary_string = atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // Compress the URL data object with LZString, then encode it for safe use
    // in a URL fragment. Falls back to plain Base64 if LZString is unavailable.
    compressAndEncodeData(urlDataObj) {
        const jsonStr = JSON.stringify(urlDataObj);
        if (typeof LZString !== 'undefined') {
            return LZString.compressToEncodedURIComponent(jsonStr);
        }
        return btoa(encodeURIComponent(jsonStr));
    },

    // Reverse of compressAndEncodeData — tries LZString first, then Base64 fallback
    decodeAndDecompressData(compressedEncodedHash) {
        if (typeof LZString !== 'undefined') {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(compressedEncodedHash);
                if (decompressed) return JSON.parse(decompressed);
            } catch (e) {
                console.warn("Gizlock: LZString decompression failed, trying Base64 fallback.", e);
            }
        }
        return JSON.parse(decodeURIComponent(atob(compressedEncodedHash)));
    }
};
