/*
 * VOVALO — envoi du formulaire de contact.
 *
 * Le formulaire est pris en charge par Netlify Forms (voir contact.html :
 * data-netlify, name="contact", netlify-honeypot). Ce script ne fait que
 * l'envoyer sans recharger la page et afficher le résultat. Les notifications
 * par e-mail se règlent dans le tableau de bord Netlify, pas ici.
 *
 * Netlify n'accepte que du x-www-form-urlencoded (pas de JSON) et exige le
 * champ « form-name » dans le corps (présent en champ caché du formulaire).
 */
const ENDPOINT = "/contact";

async function envoyer(form) {
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false };
  }
}

const form = document.getElementById("form-contact");
if (form) {
  const statut = document.getElementById("form-statut");
  const bouton = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    // Champ piège rempli : on fait semblant d'avoir envoyé, sans rien envoyer.
    if (form.elements["site_web"].value) {
      statut.className = "form-statut ok";
      statut.textContent = "Merci, votre message a bien été envoyé.";
      form.reset();
      return;
    }

    bouton.disabled = true;
    statut.className = "form-statut";
    statut.textContent = "Envoi en cours…";
    const res = await envoyer(form);
    bouton.disabled = false;

    if (res.ok) {
      statut.className = "form-statut ok";
      statut.textContent = "Merci, votre message a bien été envoyé. Nous vous répondons rapidement.";
      form.reset();
    } else {
      statut.className = "form-statut err";
      statut.textContent = "L'envoi a échoué. Votre message n'a pas été envoyé ; merci de réessayer plus tard.";
    }
  });
}
