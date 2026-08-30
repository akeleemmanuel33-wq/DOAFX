# DOAFX — Project File Structure

Vanilla HTML/CSS/JS + Supabase + Vercel. Multi-page architecture (not a single-page app) — each route is its own HTML file, sharing common CSS/JS modules.

```
doafx/
│
├── public/                          # Static assets served as-is
│   ├── favicon.ico
│   ├── logo.svg
│   ├── logo-dark.svg
│   ├── manifest.json                # PWA manifest
│   ├── robots.txt                   # Google indexing rules
│   ├── sitemap.xml                  # Google Search Console
│   └── icons/                       # PWA icons (multiple sizes)
│       ├── icon-192.png
│       ├── icon-512.png
│       └── maskable-icon.png
│
├── index.html                       # Landing page (CopyBridge-style, DOAFX copy)
├── signup.html
├── login.html
├── verify-email.html
├── forgot-password.html
│
├── dashboard/
│   ├── index.html                   # Main user dashboard (signal feed + timer)
│   ├── subscribe.html               # Plan selection (Weekly/Monthly/Yearly)
│   ├── payment.html                 # Account number + "proceed to payment"
│   ├── confirm-payment.html         # Receipt upload + plan reconfirmation
│   ├── settings.html                # Bio, avatar, display name, logout
│   ├── customer-care.html
│   └── contact.html                 # WhatsApp button + Web3Forms form
│
├── admin/
│   ├── index.html                   # Admin dashboard (send signal, quick stats)
│   ├── users.html                   # Searchable user list
│   └── user-detail.html             # Individual user page (timer, enable/disable/suspend/delete)
│
├── legal/
│   ├── terms.html
│   ├── privacy.html
│   └── privacy-settings.html
│
├── css/
│   ├── tokens.css                   # Design tokens: colors, type scale, spacing (from UI reference)
│   ├── base.css                     # Reset + global element styles
│   ├── components.css               # Buttons, cards, badges, toasts, modals
│   ├── landing.css                  # Landing-page-specific layout
│   ├── dashboard.css                # Dashboard/admin layout (denser grid)
│   ├── auth.css                     # Auth form styling
│   └── themes.css                   # Light/dark theme variable overrides
│
├── js/
│   ├── supabase-client.js           # Supabase init (URL + anon key)
│   ├── auth.js                      # Signup/login/verify/password toggle logic
│   ├── dashboard.js                 # Timer render, subscription state, dashboard init
│   ├── signals-realtime.js          # Realtime subscription to `signals` table, feed rendering
│   ├── payment-flow.js              # Plan select → receipt upload → WhatsApp redirect
│   ├── admin-users.js               # User search, enable/disable/suspend/delete actions
│   ├── admin-signals.js             # Admin signal submission form
│   ├── settings.js                  # Profile edit logic
│   ├── theme-toggle.js              # Light/dark switch, persisted preference
│   ├── notifications.js             # Push permission request + subscription registration
│   └── sw-register.js               # Service worker registration
│
├── sw.js                            # Service worker (offline cache + push event handler)
│
├── api/                             # Vercel serverless functions
│   ├── send-push.js                 # Triggered on new signal insert → sends Web Push
│   ├── stripe-webhook.js            # (only if payment gateway added later — currently manual flow)
│   └── expire-check.js              # Optional manual trigger for subscription expiry sweep
│
├── supabase/
│   ├── schema.sql                   # Table definitions
│   ├── rls-policies.sql             # Row Level Security policies
│   ├── functions/
│   │   └── expire-subscriptions/    # Scheduled Edge Function (cron) — flips expired subs
│   └── seed.sql                     # Optional test data
│
├── vercel.json                      # Routing + headers config
├── package.json                     # If using any build tooling (optional for vanilla JS)
└── README.md
```

## Notes on the arrangement

- **Page-per-route, not SPA** — matches my existing stack pattern (as on UNIMAPS/CRONIQ). Each `.html` file loads shared `css/tokens.css` + `css/base.css` + its section-specific stylesheet, plus `js/supabase-client.js` + its own logic file.
- **`css/tokens.css`** is the single source of truth pulled from the CopyBridge reference (colors, type scale, spacing, radius) — every other stylesheet reads from these CSS variables so landing page and dashboard never drift apart.
- **`admin/`** is a separate folder, gated client-side by role check on load and server-side via RLS — not a hidden route, a properly access-controlled section.
- **`supabase/`** folder isn't deployed with the frontend — it's your source-of-truth SQL, run against the Supabase project directly (via SQL editor or CLI migrations).
- **`api/`** functions are the only "backend code" outside Supabase — used specifically for Web Push sending, since that needs a server context with VAPID private keys.