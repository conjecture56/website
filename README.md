# Conjecture 56 Website

Public website for Conjecture 56. The source lives in the
`conjecture56/website` GitHub repository and the static site will be deployed to
Cloudflare Pages at:

```text
https://conjecture56.org
```

## Goal

Build a small, fast website that:

1. Presents Conjecture 56 and its AI API.
2. Lets a key holder inspect only that key's quota and usage.
3. Shows the exact OpenCode configuration required to use the API.

## Site map

| Route | Purpose |
|---|---|
| `/` | Project presentation, value proposition, capabilities, and link to API access instructions |
| `/keys/` | Self-service quota lookup and OpenCode setup tutorial |

Use `/keys/` rather than `/api/` to avoid confusing the website with the real
API host at `api.conjecture56.org`.

## Architecture

```text
GitHub repository ── deploy ── Cloudflare Pages ── conjecture56.org
                                               │
                                               └── browser request
                                                     │
                                                     ▼
                                           api.conjecture56.org
```

The first version should be a static site built with semantic HTML, CSS, and a
small JavaScript module. Do not add React, Next.js, a database, or a server-side
application unless a future requirement needs them.

## Quota lookup

The browser can query Bifrost directly:

```http
GET https://api.conjecture56.org/api/governance/virtual-keys/quota
X-Api-Key: sk-...
```

The endpoint returns only the limits and consumption associated with the
submitted virtual key. CORS has been verified for `X-Api-Key` from browser
origins, so the website does not need a proxy or backend.

Present the response as readable cards or tables rather than raw JSON:

- Key status.
- Requests-per-minute limit and current usage.
- Daily and monthly token usage.
- Per-model token or request limits.
- Clear states for invalid, disabled, or rate-limited keys.

## OpenCode tutorial

The `/keys/` page shows a one-line installer after a successful quota
inspection:

```bash
curl -fsSL https://conjecture56.org/install.sh | sh
```

The installer (source: `install.sh` in this repository) asks for the API key
with hidden input, queries the quota endpoint for the models available to
that key, and merges a `providers.conjecture56` block into the first OpenCode
configuration it finds (`./opencode.json`, `./.opencode/opencode.json`, or
`~/.config/opencode/opencode.json`, created if absent). It backs up the file
before writing and never prints the key.

JSON editing needs `python3`, `node`, `bun`, or `jq`; without any of them the
script modifies nothing and prints manual instructions. The resulting block:

```jsonc
{
  "providers": {
    "conjecture56": {
      "name": "Conjecture 56",
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "https://api.conjecture56.org/v1",
        "apiKey": "sk-YOUR-KEY"
      },
      "models": {
        "qwen3.6": { "name": "Qwen3.6" }
      }
    }
  }
}
```

A minimal verification command:

```bash
opencode run --model conjecture56/qwen3.6 \
  "Reply exactly: Conjecture 56 ok"
```

## Security requirements

An API key is a credential. The implementation must:

- Keep the entered key only in JavaScript memory.
- Never store it in cookies, `localStorage`, or `sessionStorage`.
- Never include it in a URL, query string, analytics event, or application log.
- Use a password-style input with an explicit show/hide control.
- Submit with `fetch`, not a form navigation.
- Avoid third-party scripts and analytics on `/keys/`.
- Clear the input and rendered sensitive state on user request.
- Never expose the upstream NaN credential or Bifrost administrator secrets.

Cloudflare Pages should serve a `_headers` file with at least:

```text
/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.conjecture56.org; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```

Do not use inline scripts or inline styles; the CSP intentionally rejects them.

## Suggested structure

```text
.
├── index.html
├── keys/
│   └── index.html
├── assets/
│   ├── css/
│   │   └── site.css
│   ├── js/
│   │   └── quota.js
│   └── images/
├── _headers
├── 404.html
└── README.md
```

## Deployment

1. Connect this repository to a Cloudflare Pages project.
2. Use the repository root as the static output directory; no build command is
   required for the initial version.
3. Attach `conjecture56.org` as the production custom domain.
4. Redirect `www.conjecture56.org` and the generated `*.pages.dev` hostname to
   the apex domain.
5. Verify HTTPS, security headers, both routes, quota lookup, and the copy
   controls after deployment.

The existing MX and TXT records at the domain apex belong to Zoho mail and must
not be removed when the web DNS record is created.

## Definition of done

- [ ] The home page clearly explains what Conjecture 56 provides.
- [ ] `/keys/` successfully renders quota data for a valid virtual key.
- [ ] Invalid and unavailable API responses have understandable messages.
- [ ] No entered key survives a reload or appears in browser storage or URLs.
- [ ] The OpenCode example can be copied and works with the production API.
- [ ] Mobile and keyboard navigation work without horizontal overflow.
- [ ] The site has useful title, description, favicon, and social metadata.
- [ ] `conjecture56.org` and `www.conjecture56.org` use HTTPS correctly.
- [ ] Security headers are present in production responses.
- [ ] No secret is committed to this repository.

## Out of scope for the first version

- Issuing, rotating, or revoking API keys.
- Administrator access to Bifrost.
- User accounts or authentication.
- Persisting usage history in the website.
- Proxying model inference through the website.
