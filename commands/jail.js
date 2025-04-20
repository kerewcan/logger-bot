module.exports = {
    settings: { name: "jail", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args: [action, user] }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        if(!action) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Parametre kullanımın yanlış. Doğrusu:
                    \`${client.settings.prefix}jail [al/çıkart] [etiket/id]\``,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })
        if(!['al','çıkart'].includes(action.toLowerCase())) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Parametre kullanımın yanlış. Doğrusu:
                    \`${client.settings.prefix}jail [al/çıkart] [etiket/id]\``,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })
        var user = message.mentions.users.first() || (user && await client.users.fetch(user).catch(() => undefined))
        if(!user) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Kullanıcıyı bulamadım! Lütfen tekrar dene.`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })

        user = message.guild.members.cache.get(user.id);

        if(action.toLowerCase() == "al") {
            user.roles.remove('1116132537564155914');
            user.roles.add('1116136172230561894');

            return client.logger.announce({
                event: message.channelId,
                embeds: [
                    {
                        timestamp: true, 
                        description: `Başarıyla jaile atıldı!`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ],
                timeout: 10
            })
        } else if(action.toLowerCase() == "çıkart") {
            user.roles.remove('1116136172230561894');
            user.roles.add('1116132537564155914');
            return client.logger.announce({
                event: message.channelId,
                embeds: [
                    {
                        timestamp: true, 
                        description: `Başarıyla jailden çıkarıldı!`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ],
                timeout: 10
            })
        }
    }
}