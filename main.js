/**
 * Central Échafaudages — main.js
 *
 * Fonctionnalités :
 *  1. Navigation formulaire étape 1 → 2
 *  2. Plein écran formulaire sur mobile
 *  3. Carte interactive Île-de-France (D3.js)
 *  4. Envoi via proxy Netlify Function → GAS → Sheets + Trello
 *     (vrai retour succès/erreur — plus de faux positif no-cors)
 */

(function () {
  'use strict';

  /*
   * ENDPOINT : on passe par notre proxy Netlify Function
   * plutôt que d'appeler GAS directement depuis le navigateur.
   * Avantages :
   *  - On obtient une vraie réponse HTTP (200 / 4xx / 5xx)
   *  - L'URL GAS n'est plus visible dans le code client
   *  - On peut afficher un vrai message d'erreur si GAS plante
   */
  var SUBMIT_URL = '/functions/submit';

  /* ──────────────────────────────────────────────────────────────
   * ERREURS ACCESSIBLES
   * ────────────────────────────────────────────────────────────── */
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.focus();
  }
  function clearError(id) {
    var el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  }

  /* ──────────────────────────────────────────────────────────────
   * PLEIN ÉCRAN FORMULAIRE — mobile uniquement (≤ 768px)
   * ────────────────────────────────────────────────────────────── */
  var formBox      = document.getElementById('form-box');
  var quote        = document.getElementById('contact-quote');
  var closeBtn     = document.getElementById('form-close-btn');
  var isFullscreen = false;

  function enterFullscreen() {
    if (isFullscreen || window.innerWidth > 768) return;
    isFullscreen = true;
    formBox.classList.add('form-fs');
    if (quote) quote.style.display = 'none';
    document.body.style.overflow = 'hidden';
  }

  function exitFullscreen() {
    if (!isFullscreen) return;
    isFullscreen = false;
    formBox.classList.remove('form-fs');
    if (quote) quote.style.display = '';
    document.body.style.overflow = '';
  }

  if (formBox) {
    formBox.addEventListener('focusin', function (e) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        enterFullscreen();
      }
    });
    formBox.addEventListener('click', function (e) {
      if (e.target.classList.contains('radio-label')) enterFullscreen();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      exitFullscreen();
      var section = document.getElementById('contact');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768 && isFullscreen) exitFullscreen();
  });

  /* ──────────────────────────────────────────────────────────────
   * NAVIGATION FORMULAIRE
   * ────────────────────────────────────────────────────────────── */
  var step1   = document.getElementById('step-1');
  var step2   = document.getElementById('step-2');
  var nextBtn = document.getElementById('next-btn');
  var prevBtn = document.getElementById('prev-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      clearError('error-step1');
      var adresseEl   = document.getElementById('adresse');
      var typeTravaux = document.querySelector('input[name="type_travaux"]:checked');

      if (!typeTravaux) {
        showError('error-step1', 'Veuillez sélectionner un type de travaux.');
        return;
      }
      if (!adresseEl || adresseEl.value.trim().length < 2) {
        showError('error-step1', 'Veuillez indiquer la ville ou le code postal du chantier.');
        if (adresseEl) adresseEl.focus();
        return;
      }

      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      var first = step2.querySelector('input:not([type="hidden"])');
      if (first) first.focus();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      clearError('error-step2');
      step2.classList.add('hidden');
      step1.classList.remove('hidden');
      if (nextBtn) nextBtn.focus();
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * CARTE INTERACTIVE ÎLE-DE-FRANCE (D3.js)
   * ────────────────────────────────────────────────────────────── */
  function initMap() {
    var svgEl = document.getElementById('idf-svg');
    if (!svgEl || typeof d3 === 'undefined') return;

    var codesIDF = ['75', '77', '78', '91', '92', '93', '94', '95'];

    d3.json('./idf.geojson').then(function (geojson) {
      /* Filtrage avant fitSize — projection calculée sur le bon périmètre */
      geojson.features = geojson.features.filter(function (f) {
        return codesIDF.includes(f.properties.code);
      });

      var svg        = d3.select('#idf-svg');
      var projection = d3.geoMercator().fitSize([500, 500], geojson);
      var pathGen    = d3.geoPath().projection(projection);

      var depts = svg.selectAll('g')
        .data(geojson.features)
        .enter().append('g')
        .attr('class', 'dept');

      depts.append('path').attr('d', pathGen);

      depts.append('text')
        .attr('x',     function (d) { return pathGen.centroid(d)[0]; })
        .attr('y',     function (d) { return pathGen.centroid(d)[1]; })
        .attr('class', 'dept-label')
        .attr('dx',    function (d) { return d.properties.code === '92' ? -7  : 0; })
        .attr('dy',    function (d) { return d.properties.code === '92' ? 12  : 0; })
        .attr('aria-hidden', 'true')
        .text(function (d) { return d.properties.code; });

    }).catch(function (err) {
      console.warn('Carte IDF non disponible :', err);
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * ENVOI DU FORMULAIRE
   *
   * On envoie vers /.netlify/functions/submit (proxy).
   * Ce proxy contacte GAS et nous retourne une vraie réponse JSON.
   * On affiche "succès" seulement si le proxy confirme { ok: true }.
   * Sinon on affiche un message d'erreur précis.
   * ────────────────────────────────────────────────────────────── */
  var form = document.getElementById('devisForm');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError('error-step2');

      var submitBtn  = document.getElementById('submit-btn');
      var successMsg = document.getElementById('successMsg');

      /* Honeypot */
      var hp = form.querySelector('input[name="hp_url"]');
      if (hp && hp.value.trim() !== '') {
        /* Bot détecté : faux succès silencieux */
        form.classList.add('hidden');
        if (successMsg) successMsg.classList.remove('hidden');
        return;
      }

      /* Validation email */
      var emailEl = document.getElementById('email');
      if (emailEl && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailEl.value.trim())) {
        showError('error-step2', 'Adresse email invalide — ex : nom@entreprise.fr');
        emailEl.focus();
        return;
      }

      /* Consentement RGPD */
      var rgpd = document.getElementById('rgpd');
      if (rgpd && !rgpd.checked) {
        showError('error-step2', 'Veuillez accepter la politique de confidentialité.');
        rgpd.focus();
        return;
      }

      /* Envoi */
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Transmission…';
      submitBtn.setAttribute('aria-busy', 'true');

      var payload = Object.fromEntries(new FormData(form));
      delete payload.hp_url;

      fetch(SUBMIT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
      .then(function (res) {
        /* On lit la réponse JSON du proxy */
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.status === 'ok') {
          /* Vrai succès confirmé par le serveur */
          form.classList.add('hidden');
          if (successMsg) {
            successMsg.classList.remove('hidden');
            successMsg.focus();
          }
          exitFullscreen();
        } else {
          /* GAS a répondu mais avec une erreur */
          var msg = (result.data && result.data.error)
            ? 'Erreur : ' + result.data.error + '. Appelez le 01 89 48 09 28.'
            : 'Erreur inattendue. Appelez le 01 89 48 09 28.';
          showError('error-step2', msg);
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Envoyer';
          submitBtn.removeAttribute('aria-busy');
        }
      })
      .catch(function (err) {
        /* Erreur réseau / proxy indisponible */
        console.error('Erreur réseau :', err);
        showError('error-step2', 'Problème de connexion. Appelez le 01 89 48 09 28.');
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Envoyer';
        submitBtn.removeAttribute('aria-busy');
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * INIT
   * ────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initMap(); });
  } else {
    initMap();
  }

})();
