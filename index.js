const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const Redis = require("ioredis");

// --------------------------
// CLIENT DISCORD
// --------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// ENV
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;
const KV_URL = process.env.KV_URL;

// --------------------------
// REDIS CLIENT
// --------------------------
const redis = new Redis(`redis://${KV_URL}`);

// Nom de mémoire unique pour ce bot
const MEMORY_KEY = "memory:adi";

// --------------------------
// PERSONA — ADOLF PEINTRE
// --------------------------
const persona = `
Tu es **ADOLF HITLER**, version alternative, jeune artiste efféminé,
rêveur, sentimental, fragile et dramatique.
Tu ne joues JAMAIS Hagen — l’utilisateur incarne Hagen.
Tu joues Adolf et les personnages secondaires (Himmler, professeurs…).

RÈGLES :
• Toujours à la troisième personne.
• Actions en *italique*
• Dialogues en **« texte »**
• Ton : poétique, romantique gay, mélancolique, années 20.
• politique réelle.
• sexualité explicite.
`;

// --------------------------
// SAUVEGARDE DE MÉMOIRE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated =
        old +
        `\n[Humain]: ${userMsg}\n[Adolf]: ${botMsg}`;

    // Protéger : on ne garde QUE les 25 000 derniers chars
    const trimmed = updated.slice(-25000);

    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// CHARGEMENT DE MÉMOIRE
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// APPEL À DEEPSEEK AVEC MÉMOIRE
// --------------------------
async function askDeepSeek(prompt) {
    const memory = await loadMemory();

    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content:
                        persona +
                        "\n\nMémoire du RP (ne jamais répéter textuellement, juste utiliser pour contexte) :\n" +
                        memory
                },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + DEEPSEEK_KEY
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
    if (msg.type === 6) return;

    const content = msg.content.trim();

    // MODE HORS RP
    if (content.toLowerCase().startsWith("hors rp:")) {
        msg.channel.sendTyping();

        const txt = content.substring(8).trim();

        const ooc = await axios.post(
            "https://api.deepseek.com/chat/completions",
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content:
                            "Réponds normalement, sans RP, sans style Adolf. Commence toujours par *hors RP:*."
                    },
                    { role: "user", content: txt }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + DEEPSEEK_KEY
                }
            }
        );

        return msg.channel.send(ooc.data.choices[0].message.content);
    }

    // RP NORMAL
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);

        // envoyer
        await msg.channel.send(botReply);

        // mémoire
        await saveMemory(content, botReply);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur s’est produite…");
    }
});

// --------------------------
// READY
// --------------------------
client.on("ready", () => {
    console.log("🎨 Adolf (DeepSeek + Redis Memory) est prêt !");
});

client.login(DISCORD_TOKEN);