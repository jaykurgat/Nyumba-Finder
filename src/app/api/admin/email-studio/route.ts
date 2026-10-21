import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { getEmailStudioState, saveEmailStudioState, renderPremiumEmail, type EmailTemplate } from "@/lib/email-studio";
import { sendAuthEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const templateSchema = z.object({
  key: z.enum(["house_request_client", "house_request_admin", "account_welcome", "account_password_reset", "account_password_changed", "agent_application", "agent_application_admin", "agent_status"]),
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(240),
  subject: z.string().trim().min(3).max(180),
  preheader: z.string().max(180),
  headline: z.string().trim().min(2).max(140),
  body: z.string().trim().min(5).max(6000),
  buttonLabel: z.string().trim().min(2).max(50),
  buttonUrl: z.string().max(500).refine((value) => value === "{{resetUrl}}" || /^https:\/\//i.test(value), "Use an HTTPS URL or the resetUrl merge field."),
});
const sample = { name:"Amina", reference:"NF-2048", phone:"+254 712 345 678", email:"amina@example.com", propertyType:"Apartment", bedrooms:"2", locations:"Kilimani, Nairobi", budget:"KSh 25,000 – KSh 40,000 per month", moveIn:"Next month", mustHaves:"Reliable water, security", notes:"Near public transport", resetUrl:"https://www.nyumba-finder.com/account?mode=reset&token=preview-token", statusMessage:"Your application has been approved." };

export async function GET() {
  try { await requireAdmin(); return NextResponse.json(await getEmailStudioState()); }
  catch (error) { const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED_ADMIN"; return NextResponse.json({message: unauthorized ? "Please sign in as an admin." : "Unable to load email templates."},{status: unauthorized ? 401 : 500}); }
}
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const state = await getEmailStudioState();
    if (action === "save" || action === "publish") {
      const parsed = z.array(templateSchema).length(8).safeParse(body.templates);
      if (!parsed.success || new Set(parsed.data?.map(t=>t.key)).size !== 2) return NextResponse.json({message:"Check each template and its required fields."},{status:400});
      const templates = parsed.data as EmailTemplate[];
      const next = { ...state, drafts: templates, ...(action === "publish" ? { published: templates, publishedAt: new Date().toISOString() } : {}) };
      await saveEmailStudioState(next);
      await prisma.auditLog.create({data:{action: action === "publish" ? "EMAIL_TEMPLATES_PUBLISHED" : "EMAIL_TEMPLATES_SAVED",entityType:"EmailTemplate",details:{keys:templates.map(t=>t.key)}}}).catch(()=>undefined);
      return NextResponse.json({message: action === "publish" ? "Templates published. New emails for the published templates will use this design." : "Drafts saved.", state:next});
    }
    if (action === "test") {
      const parsed = templateSchema.safeParse(body.template);
      const to = typeof body.to === "string" ? body.to.trim().slice(0,254) : "";
      if (!parsed.success || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({message:"Enter a valid test recipient and check the template."},{status:400});
      const rendered = renderPremiumEmail(parsed.data as EmailTemplate, sample);
      await sendAuthEmail({to,subject:"[Preview] "+rendered.subject,html:rendered.html,text:rendered.text});
      return NextResponse.json({message:"Test email accepted by Resend."});
    }
    return NextResponse.json({message:"Unknown action."},{status:400});
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED_ADMIN";
    if (unauthorized) return NextResponse.json({message:"Please sign in as an admin."},{status:401});
    console.error("EMAIL_STUDIO_ACTION_FAILED",error);
    return NextResponse.json({message:"Could not complete the email action. Check email configuration and try again."},{status:500});
  }
}
