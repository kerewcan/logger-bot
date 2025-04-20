console.time('Started App')
const Discord = require('discord.js');
const { Client, Collection } = require('discord.js');
const fs = require('fs');
const Logger = require('./utils/Logger');
const Database = require('./utils/Database');
const LoggerSettings = new Database({ file: "/.db/settings.json" });

const client = new Client({
    checkUpdate: false,
    partials: ["MESSAGE", "CHANNEL", "REACTION"],
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildModeration,
        Discord.GatewayIntentBits.GuildInvites
    ]
});

new Logger({ 
    client, 
    guild: "1114371546232926218",
    emoteRoleSettings: {
        guildMemberEmoteRoleAdd: "1115467998623440977", // rol bildirim kanalları
        guildMemberEmoteRoleRemove: "1115467998623440977",
        channelId: "1116135447312203806", // rol mesaj kanalı
        roles: ['1116132537564155914'], // verilcek rol
        emote: "💀" // emoji
    },
    channels: {
        /* Sunucu */
        guildMemberAdd: "1115480358914363412",
        guildMemberRemove: "1115480328589549618",
        guildMemberVanity: "1115467318814851072",
        /* Metin Kanalları */
        messageCreate: "1115467256483287051",
        messageDelete: "1116083255481991210",
        messageUpdate: "1116083202340163584",
        /* Ses Kanalları */
        voiceChannelJoin: "1115468064079745104",
        voiceChannelLeave: "1115468064079745104",
        voiceChannelSwitch: "1115468722518368276",
        /* Üye */
        guildMemberRoleAdd: "1115467998623440977",
        guildMemberRoleRemove: "1115467998623440977",
        guildMemberNicknameUpdate: "1115468074028650517",

        guildMemberMute: "1115467052614951013",
        guildMemberDeaf: "1115468136666370059",
        guildMemberTimeout: "1115467344240709673",

        memberKick: "1115467332114993272",
        memberBanAdd: "1115467078179233832",
        memberBanRemove: "1115474536566099968"
    },
    colors: {
        success: "#57F287",
        error: "#ED4245",
        information: "#5865F2",
        warning: "#FEE75C",
        announce: "#EB459E",
        white: "#FFFFFF",
        black: "#000000"
    }
});

client.database = LoggerSettings;
client.settings = {
    token: '',
    prefix: ".", owners: ['267716424615723019'], devMode: false
}

client.commands = new Collection();


client.on('ready', async () => {
    client.user.setStatus('idle');
    console.timeEnd('Started App');

    fs.readdir("./commands/", (err, files) => {
        if (err) console.error(err);
        files.forEach(file => {
          if (!file.endsWith(".js")) return;
          const command = require(`./commands/${file}`);
          console.log(`[LOG] (${file}) adlı komut işlendi.`);
          command.onLoad(client);
          client.commands.set(command.settings.name, command)
        });
    });
});

client.on('messageCreate', async (message) => {
    if(!message.content.startsWith(client.settings.prefix)) return;
    if(client.settings.devMode && !client.settings.owners.includes(message.author.id)) return;

    let [command, ...args] = message.content.slice(client.settings.prefix.length).split(/ +/g)
    if(!client.commands.has(command)) return;
    command = client.commands.get(command);
    command.run({ client, message, args });
})


client.login(client.settings.token).catch(err => console.error('[HATA] Discord botunun TOKEN\'i hatalı. Bota giriş yapamadım.'));