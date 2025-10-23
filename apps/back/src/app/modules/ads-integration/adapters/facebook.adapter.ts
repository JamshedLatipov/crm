export function normalizeFacebookLead(payload: any) {
  // Facebook Lead Ads webhook mapping
  const out: any = { raw: payload };

  // Facebook often nests data in entry[].changes[].value
  const entry = Array.isArray(payload.entry) ? payload.entry[0] : payload;
  const value = entry?.changes?.[0]?.value || payload;

  out.email = value.email || value.email_address || null;
  out.phone = value.phone_number || value.phone || null;
  out.name = value.full_name || `${value.first_name || ''} ${value.last_name || ''}`.trim() || null;
  out.campaign = value.form_id || value.ad_id || value.campaign_name || null;
  out.utmSource = value.utm_source || null;
  out.utmCampaign = value.utm_campaign || null;
  out.utmMedium = value.utm_medium || null;

  // map answers field
  if (Array.isArray(value.answers)) {
    out.customFields = {};
    for (const a of value.answers) {
      if (a.name) out.customFields[a.name] = a.text || a.value || null;
    }
  } else {
    out.customFields = value.custom_fields || null;
  }

  return out;
}
