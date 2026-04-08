/**
 * Cloudflare Pages Function — functions/submit.js
 * Proxy entre le formulaire et Google Apps Script.
 * URL GAS et token stockés dans les variables d'environnement Cloudflare.
 */

export async function onRequestPost(context) {

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  /* Parse du body */
  let payload;
  try {
    payload = await context.request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'JSON invalide' }),
      { status: 400, headers: corsHeaders }
    );
  }

  /* Validation des champs requis */
  const required = ['nom', 'entreprise', 'email', 'telephone', 'adresse', 'type_travaux'];
  for (const field of required) {
    const val = payload[field];
    if (!val || String(val).trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Champ manquant : ' + field }),
        { status: 400, headers: corsHeaders }
      );
    }
  }

  /* Validation email */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
    return new Response(
      JSON.stringify({ error: 'Email invalide' }),
      { status: 400, headers: corsHeaders }
    );
  }

  /* Ajout du token secret (invisible côté client) */
  payload.token = context.env.FORM_TOKEN || '';

  /* Appel Google Apps Script */
  const gasUrl = context.env.GAS_URL;
  if (!gasUrl) {
    return new Response(
      JSON.stringify({ error: 'Configuration serveur manquante' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let gasData;
    try {
      gasData = await gasResponse.json();
    } catch (e) {
      gasData = { status: 'ok' };
    }

    if (!gasResponse.ok) {
      return new Response(
        JSON.stringify({ error: gasData.error || 'Erreur GAS' }),
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ status: 'ok' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Service temporairement indisponible' }),
      { status: 503, headers: corsHeaders }
    );
  }
}

/* Gestion preflight CORS (OPTIONS) */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
