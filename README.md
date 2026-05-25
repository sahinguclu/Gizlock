# Gizlock

**A serverless, zero-database encrypted publishing tool. Write a page. Share a link. Nothing is stored anywhere.**

🔗 **[sahinguclu.github.io/Gizlock](https://sahinguclu.github.io/Gizlock)** — or self-host it yourself in under a minute.

---

## Why does Gizlock exist?

The internet has a storage problem — and a censorship problem.

Every time you publish something, you are handing it to a third party. A platform can delete your post, suspend your account, go offline, get acquired, or simply change its terms. Your content stops existing. You have no control.

Gizlock solves this by eliminating storage entirely. **Everything you write lives inside the link itself** — compressed and encrypted. The link *is* the article. No server holds your content. No platform can take it down because there is nothing to take down. The only way your page disappears is if every copy of that URL is destroyed.

On top of that, the encryption is not cosmetic. Gizlock uses AES-256-GCM — the same standard protecting bank communications and military data. The key never leaves the URL fragment, which browsers never send to servers. Even if someone intercepted your network traffic and captured the URL, they would see only random-looking bytes.

And because everything is static HTML, CSS, and JavaScript, the tool itself is immortal. Fork it, host it on any server in the world, and it works identically.

---

## Inspiration

Gizlock is a direct combination of two projects:

**[Telegraph](https://telegra.ph/)** by Telegram is a beautifully minimal anonymous publishing tool. You open it, write, and get a link. No account. The experience is frictionless. But the content lives on Telegram's servers — they can take it down, and someday they will shut down.

**[Link Lock](https://github.com/jstrieb/link-lock)** by [@jstrieb](https://github.com/jstrieb) is a brilliant tool that hides an encrypted URL inside another URL using AES encryption entirely in the browser. It proved that the URL fragment is a valid and secure data store. But it encrypts links, not articles.

Gizlock takes the writing experience of Telegraph and the zero-server encryption philosophy of Link Lock and merges them into one thing: a place where you can write an article, a note, an announcement, or anything — and share it as a single encrypted link that no one can moderate, take down, or intercept.

---

## Features

- **Zero accounts** — no sign-up, no login, no tracking
- **Zero server storage** — the content never touches a database or server
- **AES-256-GCM encryption** — client-side encryption using the browser's native Web Crypto API
- **Password protection** — lock a page behind a password using PBKDF2 key derivation (100,000 iterations)
- **Time-locked access** — set a Valid From and/or Valid Until date; the page refuses to open outside that window
- **NTP-verified time** — time locks are checked against real internet time servers (timeapi.io, Coinbase), not the device clock, so changing your system time won't bypass them
- **Rich text editor** — bold, italic, underline, strikethrough, headings, blockquotes, bullet and numbered lists
- **Image embedding** — embed images by direct URL; broken links show a clean error in both editor and viewer
- **Auto-linking** — pasted URLs become clickable underlined links automatically on publish
- **Dark mode** — full dark/light theme toggle, persisted in localStorage and synced across both pages
- **LZString compression** — the URL payload is compressed before encryption, keeping generated links as short as possible. For very long articles, use a link shortener like [bit.ly](https://bit.ly) or [t.ly](https://t.ly) after generating
- **Open source** — MIT licensed; fork it, host it, modify it, sell it

---

## How it works

Gizlock is a **100% static website** — HTML, CSS, and JavaScript only. No backend. No API. No database. No server-side code of any kind. Every operation happens locally inside the reader's browser.

### Encryption flow

1. You write your article in the editor on `index.html`
2. On clicking **Create Secure Link**, the browser generates a random 256-bit AES-GCM key using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
3. Your article (title, author, body HTML, time lock settings) is serialised as JSON and encrypted locally
4. If you set a password, the key is **not** stored in the URL — instead it is derived from your password + a random salt using PBKDF2, so only someone with the password can decrypt
5. If no password is set, the key is embedded in the URL fragment alongside the encrypted payload
6. The payload is compressed with LZString, then URL-encoded into the `#fragment`
7. The final link is the only copy of your content that exists anywhere

### Why the URL fragment is safe

The `#fragment` portion of a URL is never transmitted to a web server. When someone opens a Gizlock link, the server only sees `page.html` — it has no knowledge of what follows the `#`. Decryption happens entirely client-side.

### Time lock verification

If you set Valid From or Valid Until dates, the viewer fetches real UTC time from two independent public APIs (timeapi.io and Coinbase's public time endpoint) before evaluating the lock. Changing your device clock will not bypass the check.

---

## File structure

```
gizlock/
├── index.html        # The editor — write and publish
├── page.html         # The viewer — open shared links
├── css/
│   └── style.css     # All styling, light/dark theme CSS variables
└── js/
    ├── theme.js      # Dark/light toggle, persisted via localStorage
    ├── crypto.js     # AES-GCM encryption, PBKDF2 key derivation, LZString integration
    ├── editor.js     # Editor logic, image modal, publish and encrypt flow
    ├── viewer.js     # Link decoding, NTP time checks, content rendering
    └── lz-string.js  # LZString compression library (MIT — pieroxy)
```

---

## Self-hosting

Gizlock is entirely static — host it anywhere with zero configuration.

**GitHub Pages**
1. Fork this repository
2. Go to Settings → Pages → source: `main` branch, `/ (root)`
3. Live at `https://yourusername.github.io/Gizlock`

**Netlify / Vercel / Cloudflare Pages**
1. Connect your fork
2. No build step — deploy as-is

**Locally**
1. Clone the repo or download the ZIP
2. Open `index.html` directly in your browser — works fully offline

> Links are tied to the host they were generated on. A link created at `yourusername.github.io/Gizlock` must be opened there.

---

## Security notes

- **AES-GCM 256-bit** via the browser's native Web Crypto API — the same standard used by HTTPS
- **PBKDF2 with SHA-256, 100,000 iterations** for password-derived keys
- The encryption key exists only in the URL fragment — never sent to any server
- Once a link is generated, the content **cannot be retrieved, edited, or deleted** — not even by the creator
- The disclaimer on the editor page reflects this honestly: because content is encrypted in the URL and never stored server-side, it cannot be moderated or taken down

---

## License

MIT License — see [LICENSE](LICENSE)

Free to use, copy, modify, distribute, sublicense, and sell. Attribution appreciated but not required.

---

## Credits

Built by [Şahin Güçlü](https://github.com/sahinguclu)  
Inspired by [Telegraph](https://telegra.ph/) and [Link Lock](https://github.com/jstrieb/link-lock) by [@jstrieb](https://github.com/jstrieb)
