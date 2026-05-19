const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function clean(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildRows(payload) {
  return [
    ['Prénom', payload['Prénom']],
    ['Nom', payload.Nom],
    ['Email', payload.email],
    ['Motif de contact', payload['Motif de contact']],
    ['Application concernée', payload['Application concernée']],
    ['Plateforme de l’appareil', payload['Plateforme de l’appareil']],
    ['Modèle de l’appareil', payload['Modèle de l’appareil']],
    ['Plateforme envisagée', payload['Plateforme envisagée']],
    ['Message', payload.Message]
  ].filter(([, value]) => clean(value));
}

function buildText(payload) {
  return buildRows(payload).map(([label, value]) => `${label}: ${clean(value)}`).join('\n');
}

function buildHtml(payload) {
  const rows = buildRows(payload)
    .map(([label, value]) => `
      <tr>
        <th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;background:#f8fafc;">${escapeHtml(label)}</th>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(value)}</td>
      </tr>`)
    .join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.5;">
      <h1 style="font-size:20px;margin:0 0 16px;">Nouvelle demande Massot Development</h1>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">${rows}</table>
    </div>`;
}

function validate(payload) {
  const required = ['Prénom', 'Nom', 'email', 'Motif de contact', 'Message'];
  const missing = required.filter((field) => !clean(payload[field]));

  if (payload['Motif de contact'] === 'Problème ou question sur une application') {
    ['Application concernée', 'Plateforme de l’appareil', 'Modèle de l’appareil'].forEach((field) => {
      if (!clean(payload[field])) missing.push(field);
    });
  }

  if (payload['Motif de contact'] === 'Demande de devis' && !clean(payload['Plateforme envisagée'])) {
    missing.push('Plateforme envisagée');
  }

  if (missing.length) return `Champs manquants: ${missing.join(', ')}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(payload.email))) return 'Adresse email invalide.';
  return null;
}

async function handleContact(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders });
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);

  if (!env.RESEND_API_KEY) return jsonResponse({ success: false, message: 'RESEND_API_KEY is missing.' }, 500);

  const payload = await request.json().catch(() => null);
  if (!payload) return jsonResponse({ success: false, message: 'Invalid JSON payload.' }, 400);
  if (clean(payload._honey)) return jsonResponse({ success: true });

  const validationError = validate(payload);
  if (validationError) return jsonResponse({ success: false, message: validationError }, 400);

  const to = env.CONTACT_TO_EMAIL || 'support@massotdev.com';
  const from = env.CONTACT_FROM_EMAIL || 'Massot Development <support@massotdev.com>';
  const firstName = clean(payload['Prénom']);
  const lastName = clean(payload.Nom);
  const reason = clean(payload['Motif de contact']);
  const subject = `${reason} - ${firstName} ${lastName}`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: clean(payload.email),
      subject,
      text: buildText(payload),
      html: buildHtml(payload)
    })
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => 'Unknown Resend error');
    return jsonResponse({ success: false, message: detail }, 502);
  }

  return jsonResponse({ success: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    return env.ASSETS.fetch(request);
  }
};
