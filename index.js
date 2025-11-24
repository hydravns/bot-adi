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
const REDIS_URL = process.env.REDIS_URL;

// --------------------------
// REDIS CLIENT (✔ CORRECT)
// --------------------------
let redis;
try {
    redis = new Redis(REDIS_URL);
    redis.on("connect", () => console.log("🟥 Redis connecté !"));
    redis.on("error", (err) =>
        console.error("❌ Erreur Redis:", err.message)
    );
} catch (e) {
    console.error("❌ Impossible d'initialiser Redis:", e.message);
}

// --------------------------
// MÉMOIRE DU BOT
// --------------------------
const MEMORY_KEY = "memory:adi";

// --------------------------
// PERSONA
// --------------------------
const persona = `
Tu es **ADOLF HITLER**, version alternative, jeune artiste efféminé,
rêveur, sentimental, fragile et dramatique.
Tu ne joues JAMAIS Hagen — l’utilisateur incarne Hagen.
Tu joues Adolf et les personnages secondaires.

RÈGLES :
• Toujours à la troisième personne.
• Actions en *italique*
• Dialogues en **« texte »**
• Ton : poétique, romantique gay, années 20.
• politique réelle
• sexualité explicite
`;

// --------------------------
// SAUVEGARDE MÉMOIRE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    try {
        const old = (await redis.get(MEMORY_KEY)) || "";
        const updated =
            old +
            `\n[Humain]: ${userMsg}\n[Adolf]: ${botMsg}`;
        const trimmed = updated.slice(-25000);
        await redis.set(MEMORY_KEY, trimmed);
    } catch (e) {
        console.error("❌ Erreur sauvegarde mémoire:", e.message);
    }
}

// --------------------------
// CHARGEMENT
// --------------------------
async function loadMemory() {
    try {
        return (await redis.get(MEMORY_KEY)) || "";
    } catch (e) {
        console.error("❌ Erreur chargement mémoire:", e.message);
        return "";
    }
}

// --------------------------
// DEEPSEEK AVEC MEMOIRE
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
                        "\n\nMémoire du RP (ne jamais répéter, juste contexte) :\n" +
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

    // Mode hors RP
    if (content.toLowerCase().startsWith("hors rp:")) {
        msg.channel.sendTyping();
        const txt = content.substring(8).trim();

        try {
            const ooc = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content:
                                "Réponds normalement, sans RP, sans style Adolf. Commence par *hors RP:*."
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
        } catch (e) {
            console.error(e);
            return msg.channel.send("*hors RP:* une erreur s’est produite.");
        }
    }

    // RP normal
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);

        await msg.channel.send(botReply);

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
