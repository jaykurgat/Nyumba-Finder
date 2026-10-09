# NyumbaFinder house-finding notifications

The guided form saves the request and calculates matches from active rental listings. It presents the House Hunt assistance service at KSh 2,500, including up to five WhatsApp video previews of suitable properties (subject to availability) and help coordinating viewings. The form does not collect payment; a representative follows up about next steps. Premium viewing assistance and transport are discussed separately. Notifications are sent only when the relevant provider credentials are configured.

## Email (Resend)

Add these Vercel environment variables for **Production** (and Preview if you intend to test a preview deployment):

- `RESEND_API_KEY`: API key from your Resend account.
- `RESEND_FROM_EMAIL`: sender identity on a domain verified in Resend, for example `NyumbaFinder <info@nyumba-finder.com>` after the domain is verified.
- `ADMIN_NOTIFICATION_EMAIL`: inbox that should receive new House Hunt requests, for example `info@nyumba-finder.com`. This is separate from the admin login.
- `ADMIN_EMAIL`: existing admin login email. Keep it unchanged unless you intentionally want to change the email used to log in.

The code uses `ADMIN_NOTIFICATION_EMAIL` first. For backward compatibility, it falls back to `ADMIN_EMAIL` only when `ADMIN_NOTIFICATION_EMAIL` is unset or empty. Therefore, set `ADMIN_NOTIFICATION_EMAIL` if the notification inbox should differ from the admin login email.

The renter receives an email confirmation when they provide an email address. The admin inbox receives the request summary. The sender domain must be verified in Resend; otherwise delivery can fail. Notification failure does not undo a saved request. Adding or changing Vercel environment variables requires a new deployment for the changes to take effect.

## WhatsApp Business Cloud API (optional)

For actual automated WhatsApp notifications, use a WhatsApp Business Cloud API number and approved message templates. A normal WhatsApp link is not sufficient to send automated template messages.

Set these variables for Production (and Preview if needed):

- `WHATSAPP_ACCESS_TOKEN`: server-side Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: Cloud API phone-number ID (not the displayed phone number).
- `WHATSAPP_ADMIN_PHONE`: NyumbaFinder team number in international format; digits are used, e.g. `2547XXXXXXXX`.
- `WHATSAPP_ADMIN_TEMPLATE_NAME`: approved template name with **five body placeholders** in this order: request reference, renter name, location, rent budget, renter phone.
- `WHATSAPP_CLIENT_TEMPLATE_NAME`: approved opt-in confirmation template with **three body placeholders** in this order: renter name, request reference, number of matches.
- `WHATSAPP_TEMPLATE_LANGUAGE`: approved template language code, default `en`.

Suggested admin template body (five placeholders):
`New NyumbaFinder House Hunt request {{1}} from {{2}}. Location: {{3}}. Budget: {{4}}. Contact: {{5}}. Service fee KSh 2,500; includes up to five video previews, subject to availability.`

Suggested client template body (three placeholders):
`Hi {{1}}, we received your NyumbaFinder House Hunt request {{2}} and found {{3}} suggested listing(s). The service fee is KSh 2,500 and includes up to five WhatsApp video previews of suitable homes, subject to availability. A representative will contact you about next steps. No payment was taken on the form.`

Because WhatsApp template text is managed in Meta WhatsApp Manager, update and get the client template approved there before relying on revised wording. Keep the same three body placeholders in the same order. Create and get both templates approved before setting their names in Vercel. Only send the client template to renters who selected WhatsApp and agreed to be contacted.

## Security and behaviour

- Never expose provider tokens to client-side environment variables.
- Do not put API keys in source control.
- Notification failures are logged server-side; they do not undo a saved request.
- Submit a real test request with an inbox you control. Verify delivery in the Resend activity log; a successful website build alone does not prove delivery.
