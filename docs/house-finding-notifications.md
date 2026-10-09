# NyumbaFinder house-finding notifications

The guided form saves the request and calculates matches from active rental listings. Notifications are sent only when the relevant provider credentials are configured.

## Email (Resend)

Add these Vercel environment variables for **Preview and Production**:

- `RESEND_API_KEY`: API key from your Resend account.
- `RESEND_FROM_EMAIL`: sender address on a domain verified in Resend, for example `NyumbaFinder <homes@your-verified-domain.example>`.
- `ADMIN_EMAIL`: inbox that should receive new renter requests. This variable already exists in the project, but ensure it is also enabled for Preview if you test this feature on a branch.

The renter receives an email confirmation when they provide an email address. The admin inbox receives the request summary. If Resend is not configured or rejects the sender, the request is still saved and the page displays that email confirmation was not sent.

## WhatsApp Business Cloud API (optional)

For actual automated WhatsApp notifications, use a WhatsApp Business Cloud API number and approved message templates. A normal WhatsApp link is not sufficient to send unsolicited automated messages outside WhatsApp's customer-service window.

Set these variables for Preview and Production when ready:

- `WHATSAPP_ACCESS_TOKEN`: server-side Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: Cloud API phone-number ID (not the displayed phone number).
- `WHATSAPP_ADMIN_PHONE`: NyumbaFinder team number in international format; digits are used, e.g. `2547XXXXXXXX`.
- `WHATSAPP_ADMIN_TEMPLATE_NAME`: approved template name with **five body placeholders** in this order: request reference, renter name, location, rent budget, renter phone.
- `WHATSAPP_CLIENT_TEMPLATE_NAME`: approved opt-in confirmation template with **three body placeholders** in this order: renter name, request reference, number of matches.
- `WHATSAPP_TEMPLATE_LANGUAGE`: approved template language code, default `en`.

Suggested admin template body:
`New NyumbaFinder house request {{1}} from {{2}}. Location: {{3}}. Budget: {{4}}. Contact: {{5}}.`

Suggested client template body:
`Hi {{1}}, NyumbaFinder received your house request {{2}} and found {{3}} suggested listing(s). Please review your matches on our website. Availability must be confirmed.`

Create and get both templates approved in WhatsApp Manager before setting their names in Vercel. Only send the client template to renters who selected WhatsApp and agreed to be contacted. The form also provides a WhatsApp click-to-chat link with a prefilled request summary so the renter can start a conversation with the team.

## Security and behaviour

- Never expose provider tokens to client-side environment variables.
- Do not put API keys in source control.
- Notification failures are logged server-side; they do not undo a saved request.
- The confirmation page does not claim that a message was sent unless the provider accepted it.
