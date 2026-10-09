# NyumbaFinder house-finding notifications

The guided form saves the request and calculates matches from active rental listings. It presents the House Hunt assistance service at KSh 2,500, including up to five WhatsApp video previews of suitable properties (subject to availability) and help coordinating viewings. The form does not collect payment; a representative follows up about next steps. Premium viewing assistance and transport are discussed separately. Notifications are sent only when the relevant provider credentials are configured.

## Email (Resend)

Add these Vercel environment variables for **Preview and Production**:

- `RESEND_API_KEY`: API key from your Resend account.
- `RESEND_FROM_EMAIL`: sender address on a domain verified in Resend, for example `NyumbaFinder <homes@your-verified-domain.example>`.
- `ADMIN_EMAIL`: inbox that should receive new renter requests. This variable already exists in the project, but ensure it is also enabled for Preview if you test this feature on a branch.

The renter receives an email confirmation when they provide an email address, including the KSh 2,500 service scope and next steps. The admin inbox receives the request summary, including the service fee and video-preview scope. If Resend is not configured or rejects the sender, the request is still saved and the page displays that email confirmation was not sent. Use a verified sender such as `NyumbaFinder <info@nyumba-finder.com>` only after `nyumba-finder.com` is verified in Resend and the mailbox can receive replies.

## WhatsApp Business Cloud API (optional)

For actual automated WhatsApp notifications, use a WhatsApp Business Cloud API number and approved message templates. A normal WhatsApp link is not sufficient to send unsolicited automated messages outside WhatsApp's customer-service window.

Set these variables for Preview and Production when ready:

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

Because WhatsApp template text is managed in Meta WhatsApp Manager, update and get the client template approved there before relying on the revised wording. Keep the same three body placeholders in the same order.

Create and get both templates approved in WhatsApp Manager before setting their names in Vercel. Only send the client template to renters who selected WhatsApp and agreed to be contacted. The form also provides a WhatsApp click-to-chat link with a prefilled request summary so the renter can start a conversation with the team.

## Security and behaviour

- Never expose provider tokens to client-side environment variables.
- Do not put API keys in source control.
- Notification failures are logged server-side; they do not undo a saved request.
- The confirmation page does not claim that a message was sent unless the provider accepted it.


## Delivery checks before launch

1. In Vercel, set `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (for example `NyumbaFinder <info@nyumba-finder.com>` after domain verification), and `ADMIN_EMAIL`. Apply them to Production and Preview as needed.
2. For automatic WhatsApp delivery, set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE`, `WHATSAPP_ADMIN_TEMPLATE_NAME`, `WHATSAPP_CLIENT_TEMPLATE_NAME`, and `WHATSAPP_TEMPLATE_LANGUAGE`. Both WhatsApp templates must be approved and match the placeholder counts and order above.
3. Client email is sent when an email address is provided. Client WhatsApp confirmation is sent only when the client selected WhatsApp as their contact preference. Admin notifications are attempted by email and WhatsApp when their respective settings are configured.
4. Submit a real test request with an inbox and WhatsApp number you control. Verify both the Resend activity log and Meta message logs; a successful website build alone does not prove delivery. Never place API credentials in GitHub.
