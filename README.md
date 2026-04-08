# URLdecode

**Understand what's really in any link.**

URLdecode is a client-side URL explainer that breaks down any URL into its parts and explains each one in plain English. Designed for casual users — no technical knowledge required.

Live demo: `https://YOUR_USERNAME.github.io/urldecode/`

---

## What it does

Paste any URL and URLdecode will explain:

- **Protocol** — is this connection secure?
- **Domain** — who owns this site?
- **Path** — where on the site does this go?
- **Query parameters** — the main event. Tracking codes, search terms, session IDs, timestamps, and more, all explained.
- **Fragment** — the `#anchor` at the end of a URL

### Platforms with specific support

| Platform | Parameters explained |
|---|---|
| Google Search | `q`, `ei`, `ved`, `oq`, `source`, `tbm`, `rlz`, `num`, `start`, `safe`, `aqs`, `gs_lcrp` |
| YouTube | `v`, `t`, `list`, `index`, `si` |
| Bing | `q`, `form`, `PC`, `cvid` |
| DuckDuckGo | `q`, `t`, `ia` |
| Twitter / X | Snowflake ID decoding, `s` share method |
| UTM Tracking | `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id` |
| Facebook | `fbclid` |
| Google Ads | `gclid`, `gad_source`, `_ga`, `_gl` |
| Microsoft Ads | `msclkid` |
| TikTok Ads | `ttclid` |
| Twitter Ads | `twclid` |
| HubSpot | `_hsenc`, `_hsmi` |
| Mailchimp | `mc_cid`, `mc_eid` |
| Instagram | `igsh` |

### Generic detection

For unknown parameters, URLdecode attempts to detect:
- Unix timestamps (seconds and milliseconds)
- Base64-encoded values
- URL-encoded (percent-encoded) values
- Sensitive parameters (tokens, API keys, passwords)

---

## Shareable links

When you decode a URL, the page's own URL updates to reflect it — e.g.:

```
https://YOUR_USERNAME.github.io/urldecode/?url=https://www.google.com/search?q=osint
```

You can share this link and the recipient will see the same decoded view.

---

## Deployment (GitHub Pages)

1. Fork or clone this repository
2. Go to **Settings > Pages** in your GitHub repo
3. Set source to `main` branch, `/ (root)` folder
4. Your site will be live at `https://YOUR_USERNAME.github.io/urldecode/`

No build step, no dependencies to install. It's plain HTML + JavaScript.

---

## File structure

```
index.html    — the full page (layout, styles, structure)
urlparse.js   — all parsing and rendering logic
LICENSE       — Apache License 2.0
README.md     — this file
```

---

## Attribution & License

URLdecode is licensed under the **Apache License 2.0**.

Parsing logic is inspired by and partially derived from
[obsidianforensics/unfurl](https://github.com/obsidianforensics/unfurl)
by Ryan Benson, also licensed under Apache 2.0.

See [LICENSE](LICENSE) for full terms.
