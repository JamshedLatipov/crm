export function normalizeGoogleLead(payload: any) {
  // Google Lead Form webhook example mapping (best-effort)
  // payload may contain: leadId, formId, answers: [{question,answer}], user: {email, name, phone}
  const out: any = { raw: payload };

  // try common locations
  out.email = payload.email || payload.user?.email || null;
  out.phone = payload.phone || payload.user?.phone || null;
  out.name = payload.name || payload.user?.name || null;
  out.campaign = payload.campaign || payload.campaignName || payload.formId || null;
  out.utmSource = payload.utm?.source || null;
  out.utmCampaign = payload.utm?.campaign || null;
  out.utmMedium = payload.utm?.medium || null;

  // flatten answers array into customFields if present
  if (Array.isArray(payload.answers)) {
    out.customFields = {};
    for (const a of payload.answers) {
      if (a.question) out.customFields[a.question] = a.answer ?? null;
      else if (a.name) out.customFields[a.name] = a.value ?? null;
    }
  } else {
    out.customFields = payload.customFields || null;
  }

  return out;
}
