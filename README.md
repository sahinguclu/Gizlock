# Gizlock

> Note: This is a concept project. The tool works as described, but it is not a finished product. It is a proof of concept for serverless, zero-storage encrypted publishing.

**A serverless, zero-database encrypted publishing tool. Write a page. Share a link. Nothing is stored anywhere.**

[gizlock.pages.dev](https://gizlock.pages.dev) -- or self-host it yourself in under a minute.

---

## Why does Gizlock exist?

Every time you publish something, you hand it to a third party. A platform can delete your post, suspend your account, go offline, get acquired, or change its terms. Your content stops existing.

Gizlock removes storage entirely. Everything you write lives inside the link itself, compressed and encrypted. The link is the article. No server holds your content. No platform can take it down because there is nothing to take down. Your page disappears only if every copy of that URL is destroyed.

The encryption is not cosmetic. Gizlock uses AES-256-GCM, the same standard protecting bank communications and military data. The key never leaves the URL fragment. Browsers never send the fragment to servers. Even if someone captured the URL from network traffic, they would see only random bytes.

Because everything is static HTML, CSS, and JavaScript, the tool itself does not depend on any service staying online. Fork it, host it on any server, and it works identically.

---

## Inspiration

Gizlock combines two projects:

**Telegraph** by Telegram is a minimal anonymous publishing tool. You open it, write, and get a link. No account. No friction. But the content lives on Telegram's servers. They can take it down, and eventually they will shut down.

**Link Lock** by [@jstrieb](https://github.com/jstrieb) hides an encrypted URL inside another URL using AES entirely in the browser. It proved that the URL fragment is a valid and secure data store. But it encrypts links, not articles.

Gizlock takes the writing experience of Telegraph and the zero-server philosophy of Link Lock and merges them. Write an article, a note, or an announcement. Share it as a single encrypted link that no one can moderate, take down, or intercept.

---

## Features

- Zero accounts -- no sign-up, no login, no tracking
- Zero server storage -- content never touches a database
- AES-256-GCM encryption -- client-side, using the browser's native Web Crypto API
- Password protection -- lock a page behind a password using PBKDF2 key derivation (100,000 iterations)
- Time-locked access -- set a Valid From and/or Valid Until date; the page refuses to open outside that window
- NTP-verified time -- time locks are checked against real internet time servers (timeapi.io, Coinbase), not the device clock, so changing your system time will not bypass them
- Rich text editor -- bold, italic, underline, strikethrough, headings, blockquotes, bullet and numbered lists
- Image embedding -- embed images by direct URL; broken links show a clean error in both editor and viewer
- Auto-linking -- pasted URLs become clickable underlined links automatically on publish
- Dark mode -- full dark/light theme toggle, persisted in localStorage and synced across both pages
- LZString compression -- the URL payload is compressed before encryption, keeping generated links as short as possible. For long articles, the generated URL will be very long and some URL shorteners will not accept it. Try a URL shortener after generating, but note that not all will work with URLs of that length.
- Open source -- MIT licensed; fork it, host it, modify it, sell it

---

## How it works

Gizlock is a 100% static website -- HTML, CSS, and JavaScript only. No backend. No API. No database. No server-side code. Every operation happens locally inside the reader's browser.

### Encryption flow

1. You write your article in the editor on `index.html`
2. On clicking **Create Secure Link**, the browser generates a random 256-bit AES-GCM key using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
3. Your article (title, author, body HTML, time lock settings) is serialised as JSON and encrypted locally
4. If you set a password, the key is not stored in the URL. Instead it is derived from your password and a random salt using PBKDF2, so only someone with the password can decrypt
5. If no password is set, the key is embedded in the URL fragment alongside the encrypted payload
6. The payload is compressed with LZString, then URL-encoded into the `#fragment`
7. The final link is the only copy of your content that exists anywhere

### Why the URL fragment is safe

The `#fragment` portion of a URL is never transmitted to a web server. When someone opens a Gizlock link, the server sees only `page.html`. It has no knowledge of what follows the `#`. Decryption happens entirely client-side.

### Time lock verification

If you set Valid From or Valid Until dates, the viewer fetches real UTC time from two independent public APIs (timeapi.io and Coinbase's public time endpoint) before evaluating the lock. Changing your device clock will not bypass the check.

---

## File structure

```
gizlock/
├── index.html        # The editor -- write and publish
├── page.html         # The viewer -- open shared links
├── css/
│   └── style.css     # All styling, light/dark theme CSS variables
└── js/
    ├── theme.js      # Dark/light toggle, persisted via localStorage
    ├── crypto.js     # AES-GCM encryption, PBKDF2 key derivation, LZString integration
    ├── editor.js     # Editor logic, image modal, publish and encrypt flow
    ├── viewer.js     # Link decoding, NTP time checks, content rendering
    └── lz-string.js  # LZString compression library (MIT -- pieroxy)
```

---

## Self-hosting

Gizlock is entirely static. Host it anywhere with zero configuration.

**GitHub Pages**
1. Fork this repository
2. Go to Settings -> Pages -> source: `main` branch, `/ (root)`
3. Live at `https://yourusername.github.io/Gizlock`

**Netlify / Vercel / Cloudflare Pages**
1. Connect your fork
2. No build step -- deploy as-is

**Locally**
1. Clone the repo or download the ZIP
2. Open `index.html` directly in your browser -- works fully offline

> Links are tied to the host they were generated on. A link created at `yourusername.github.io/Gizlock` must be opened there.

---

## Security notes

- AES-GCM 256-bit via the browser's native Web Crypto API -- the same standard used by HTTPS
- PBKDF2 with SHA-256, 100,000 iterations for password-derived keys
- The encryption key exists only in the URL fragment, never sent to any server
- Once a link is generated, the content cannot be retrieved, edited, or deleted, not even by the creator
- Because content is encrypted in the URL and never stored server-side, it cannot be moderated or taken down

---

## License

MIT License -- see [LICENSE](LICENSE)

Free to use, copy, modify, distribute, sublicense, and sell. Attribution appreciated but not required.

---

## Credits

Built by [Sahin Guclu](https://github.com/sahinguclu)
Inspired by [Telegraph](https://telegra.ph/) and [Link Lock](https://github.com/jstrieb/link-lock) by [@jstrieb](https://github.com/jstrieb)
