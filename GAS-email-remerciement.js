/**
 * Central Échafaudages — Google Apps Script
 * Ajout à insérer dans votre fonction doPost(e) existante,
 * APRÈS l'enregistrement dans Google Sheets et la création de carte Trello.
 *
 * ──────────────────────────────────────────────────────────────
 * INSTRUCTIONS :
 * 1. Ouvrez votre Google Apps Script existant
 * 2. Dans la fonction doPost(e), repérez la ligne de retour final :
 *      return ContentService.createTextOutput(...)
 * 3. Collez le bloc ci-dessous JUSTE AVANT ce return
 * ──────────────────────────────────────────────────────────────
 */

// ── Email de remerciement + lien vers le guide ───────────────
try {
  var prenom = data.nom ? data.nom.split(' ')[0] : 'Madame, Monsieur';

  var sujet = 'Votre demande Central Échafaudages — et un guide pratique pour votre chantier';

  var corpsHtml =
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">' +

    // En-tête
    '<div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0;">' +
    '<p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">Central Échafaudages</p>' +
    '</div>' +

    // Corps
    '<div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">' +
    '<p style="font-size:16px;">Bonjour ' + prenom + ',</p>' +
    '<p>Merci pour votre demande, elle a bien été prise en compte.</p>' +
    '<p>Nous revenons vers vous très rapidement pour étudier votre projet.</p>' +

    '<p style="margin-top:24px;">En attendant, nous vous invitons à consulter notre guide pratique pour éviter les erreurs courantes liées aux échafaudages et <strong>sécuriser votre chantier</strong>&nbsp;:</p>' +

    // Bouton CTA
    '<div style="text-align:center;margin:28px 0;">' +
    '<a href="https://centralechafaudages.fr/guide-echafaudage.html" ' +
    'style="background:#FF6600;color:#fff;padding:14px 28px;border-radius:8px;' +
    'text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">' +
    '👉 Consulter le guide sécurité' +
    '</a>' +
    '</div>' +

    '<p>Ce guide vous permettra d\'identifier les <strong>points de vigilance essentiels</strong> pour éviter retards, surcoûts ou interruptions de chantier.</p>' +

    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">' +

    '<p style="font-size:14px;color:#475569;">Si votre demande est urgente, vous pouvez nous joindre directement au&nbsp;' +
    '<a href="tel:0189480928" style="color:#0033A0;font-weight:bold;">01&nbsp;89&nbsp;48&nbsp;09&nbsp;28</a>.</p>' +

    '<p style="margin-top:24px;">Bien cordialement,<br>' +
    '<strong>Michel Kesraoui</strong><br>' +
    'Central Échafaudages<br>' +
    '<span style="color:#FF6600;">01 89 48 09 28</span></p>' +
    '</div>' +

    '</div>';

  GmailApp.sendEmail(
    data.email,          // destinataire = email saisi dans le formulaire
    sujet,
    // Version texte brut (fallback pour clients sans HTML)
    'Bonjour ' + prenom + ',\n\n' +
    'Merci pour votre demande, elle a bien été prise en compte.\n' +
    'Nous revenons vers vous très rapidement.\n\n' +
    'En attendant, consultez notre guide pratique :\n' +
    'https://centralechafaudages.fr/guide-echafaudage.html\n\n' +
    'Si votre demande est urgente : 01 89 48 09 28\n\n' +
    'Bien cordialement,\nCentral Échafaudages',
    {
      name:     'Central Échafaudages',
      htmlBody: corpsHtml,
      replyTo:  'etudes@centralechafaudages.fr'
    }
  );

} catch(emailErr) {
  // L'envoi de l'email ne bloque pas le reste du traitement
  Logger.log('Erreur envoi email : ' + emailErr.message);
}

// ── Fin du bloc à insérer ─────────────────────────────────────
// Suite de votre code : return ContentService.createTextOutput(...)
