# Massot Development

Static website for Massot Development.

Public domain: https://massotdev.com

Core pages:
- Home: `/`
- Apps: `/apps.html`
- Support: `/support.html`
- Privacy: `/privacy.html`
- Legal: `/legal.html`

## Contact form

The support form posts to `/api/contact`.

That route is implemented as a Cloudflare Pages Function in `functions/api/contact.js`. It sends email through Resend and requires these environment variables in Cloudflare Pages:

- `RESEND_API_KEY`: Resend API key.
- `CONTACT_TO_EMAIL`: destination inbox, for example `support@massotdev.com`.
- `CONTACT_FROM_EMAIL`: verified sender, for example `Massot Development <contact@massotdev.com>`.

Important: GitHub Pages cannot run `/api/contact`. To make the automatic email form work, deploy this repository with Cloudflare Pages, then point `massotdev.com` to the Cloudflare Pages project.
