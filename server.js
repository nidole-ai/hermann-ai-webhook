const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ================================
// HERMANN AI
// ================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

// ================================
// WHATSAPP / META
// ================================

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ================================
// PAGE D'ACCUEIL
// ================================

app.get("/", (req, res) => {
  res.status(200).send("HERMANN AI — Ton assistant créatif et business intelligent.");
});

// ================================
// VÉRIFICATION DU WEBHOOK META
// ================================

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook WhatsApp vérifié.");
    return res.status(200).send(challenge);
  }

  console.log("Échec de vérification du webhook.");
  return res.sendStatus(403);
});

// ================================
// RÉCEPTION DES MESSAGES WHATSAPP
// ================================

app.post("/webhook", async (req, res) => {
  // Répondre rapidement à Meta
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;

        const messages = value?.messages || [];

        for (const message of messages) {
          if (message.type !== "text") {
            continue;
          }

          const userMessage = message.text?.body;
          const userPhone = message.from;

          if (!userMessage || !userPhone) {
            continue;
          }

          console.log("Message reçu :", userMessage);

          const aiReply = await askHermannAI(userMessage);

          await sendWhatsAppMessage(userPhone, aiReply);
        }
      }
    }
  } catch (error) {
    console.error("Erreur webhook :", error);
  }
});

// ================================
// APPEL À HERMANN AI
// ================================

async function askHermannAI(message) {
  if (!OPENAI_API_KEY) {
    return "HERMANN AI est actuellement en cours de configuration. Réessaie dans quelques instants.";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: `
Tu es HERMANN AI,
Ton assistant créatif et business intelligent.

Tu aides l'utilisateur dans :
- la création graphique
- les prompts d'images
- le marketing
- les réseaux sociaux
- les entreprises et projets
- les documents
- Excel et les données
- l'organisation et l'automatisation.

Réponds en français sauf demande contraire.

Sois précis, pratique, professionnel et naturel.
Ne prétends jamais avoir effectué une action externe si elle n'a pas réellement été exécutée.
N'invente jamais un prix, un contact, une date ou une information commerciale.
      `,
      input: message
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erreur OpenAI :", errorText);
    return "Désolé, HERMANN AI rencontre momentanément un problème technique.";
  }

  const data = await response.json();

  return (
    data.output_text ||
    "Je n'ai pas pu générer une réponse pour le moment."
  );
}

// ================================
// ENVOI DU MESSAGE SUR WHATSAPP
// ================================

async function sendWhatsAppMessage(phoneNumber, message) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("Configuration WhatsApp incomplète.");
    return;
  }

  const url =
    `https://graph.facebook.com/v24.0/` +
    `${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erreur WhatsApp :", errorText);
  }
}

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

app.listen(PORT, () => {
  console.log(`HERMANN AI est lancé sur le port ${PORT}.`);
});
