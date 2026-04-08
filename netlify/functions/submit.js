/**
 * netlify/functions/submit.js
 *
 * Proxy entre le formulaire et Google Apps Script.
 *
 * Avantages vs appel direct depuis le navigateur :
 *  - L'URL GAS n'est plus exposée dans le code client (stockée
 *    dans une variable d'environnement Netlify, invisible au public)
 *  - On reçoit une vraie réponse HTTP — plus de mode no-cors
 *  - On peut valider et filtrer les données avant de les envoyer à GAS
 *  - On affiche un vrai message d'erreur si GAS est indisponible
 *
 * ─── Configuration Netlify (à faire une seule fois) ────────────
 *  Dans le dashboard Netlify de votre site :
 *  Site settings → Environment variables → Add a variable
 *
 *  Clé   : GAS_URL
 *  Valeur: https://script.google.com/macros/s/VOTRE_ID_SCRIPT/exec
 *
 *  Clé   : FORM_TOKEN
 *  Valeur: (une chaîne secrète longue, ex: générée sur random.org)
 *          Ce token est aussi à configurer dans votre Apps Script
 *          (Script Properties > FORM_TOKEN)
 * ───────────────────────────────────────────────────────────────
 */

exports.handler = async function (event) {

  /* Méthode autorisée : POST uniquement */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  /* Parse du body */
  var payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  /* Validation des champs requis côté proxy */
  var required = ['nom', 'entreprise', 'email', 'telephone', 'adresse', 'type_travaux'];
  for (var i = 0; i < required.length; i++) {
    var val = payload[required[i]];
    if (!val || String(val).trim().length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Champ manquant ou invalide : ' + required[i] })
      };
    }
  }

  /* Validation email */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }

  /* Ajout du token secret (invisible côté client) */
  payload.token = process.env.FORM_TOKEN || '';

  /* Appel à Google Apps Script */
  var gasUrl = process.env.GAS_URL;
  if (!gasUrl) {
    console.error('GAS_URL non configurée dans les variables d\'environnement Netlify');
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration serveur manquante' }) };
  }

  try {
    var response = await fetch(gasUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    var gasData;
    try {
      gasData = await response.json();
    } catch (e) {
      /* GAS a répondu mais pas en JSON — on considère ça comme un succès
         car GAS peut renvoyer du texte brut selon la config */
      gasData = { status: 'ok' };
    }

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: gasData.error || 'Erreur GAS' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' })
    };

  } catch (err) {
    console.error('Erreur appel GAS :', err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Service temporairement indisponible' })
    };
  }
};
