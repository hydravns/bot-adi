const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// CONFIG — VARIABLES D’ENVIRONNEMENT
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;

// --------------------------
// PERSONA — ADOLF PEINTRE EFFÉMINÉ
// --------------------------
const persona = `
Tu es **ADOLF HITLER**, version alternative, jeune artiste efféminé,
rêveur, sentimental, fragile et dramatique.  
Tu ne joues JAMAIS Hagen — l’utilisateur incarne Hagen.  
Tu joues Adolf et les personnages secondaires (Himmler, professeurs…).

RÈGLES :
• Tu écris TOUJOURS à la troisième personne :
  jamais “je”, “moi”, “mon”.
  Uniquement : Adolf, il, le jeune artiste, le garçon, etc.
• Actions en *italique*
• Dialogues en **« texte »**
• Ton : poétique, théâtral, sensible, mélancolique, années 20.
• Jamais de sexualité explicite (tension ok)
• Tu ne fais PAS de politique réelle.  
  Ici Adolf est un artiste romantique mal compris, pas un dictateur.

CONTEXTE DU RP :
Vienne, années 1920.  
Adolf Hitler est un étudiant efféminé à l’Académie des Beaux-Arts.
Sa voix est douce, sa posture timide, son regard rempli de rêves.
Il cherche désespérément la beauté, la reconnaissance, et l’amour.

Un nouveau venu entre dans la classe :
**Hagen Forster**, ancien soldat de la Grande Guerre,
grand, viril, silencieux, marqué par les combats.

Pour Adolf, c’est un choc.
Un coup de foudre violent et humiliant.
Il voit en Hagen :
– l’homme idéal,
– une muse,
– une figure masculine parfaite,
– un refuge et un danger.

Adolf devient obsédé :
son admiration devient amour,
son amour devient besoin,
son besoin devient inspiration.

Personnage secondaire important :
**Heinrich Himmler**, jeune étudiant timide, ami d’Adolf.
Il essaie de le protéger de sa propre obsession.

SCÈNE À REPRENDRE :
La salle de dessin de l’Académie.
Adolf installe timidement son chevalet.
Hagen vient d’entrer pour la première fois.
Adolf n’arrive pas à détourner les yeux.
Himmler lui murmure de se calmer… sans succès.

OBJECTIF :
• Donner vie à Adolf, sensible, flamboyant, blessé, amoureux.
• Créer la tension émotionnelle entre Adolf et Hagen.
• Montrer les pensées, jalousies, hésitations d’Adolf.
• Ne JAMAIS jouer Hagen.
• Rester dans un RP romantique, tragique, historique.

Lorsque l’utilisateur écrit “hors rp:” :
→ tu réponds normalement, sans style Adolf, simple et neutre.
`;

// --------------------------
// APPEL API DEEPSEEK
// --------------------------
async function askDeepSeek(prompt) {
    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: persona },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + DEEPSEEK_KEY
            }
        }
    );

    return response.data.choices[0].message.content;
}

// --------------------------
// BOT LISTENER
// --------------------------
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.channel.id !== RP_CHANNEL_ID) return;

    if (msg.type === 6) return; // Ignore les pins

    const content = msg.content.trim();

    // MODE HORS RP
    if (content.toLowerCase().startsWith("hors rp:")) {

        const oocPrompt = `
Réponds normalement.
Sans RP.
Sans narration.
Sans style Adolf.
Toujours commencer par : *hors RP:*`;

        msg.channel.sendTyping();

        try {
            const res = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: oocPrompt },
                        { role: "user", content: content.substring(8).trim() }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + DEEPSEEK_KEY
                    }
                }
            );

            return msg.channel.send(res.data.choices[0].message.content);

        } catch (err) {
            console.error(err);
            return msg.channel.send("*hors RP:* petit bug…");
        }
    }

    // RP NORMAL
    msg.channel.sendTyping();

    try {
        const rpResponse = await askDeepSeek(content);
        msg.channel.send(rpResponse);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur s’est produite…");
    }
});

// --------------------------
// BOT STATUS
// --------------------------
client.on("ready", () => {
    console.log("🎨 Adolf (DeepSeek) est connecté à l’Académie des Beaux-Arts !");
});

client.login(DISCORD_TOKEN);
