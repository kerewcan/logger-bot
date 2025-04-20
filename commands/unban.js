module.exports = {
    settings: { name: "unban", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args: [user] }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        var user = message.mentions.users.first() || (user && await client.users.fetch(user).catch(() => undefined))
        if(!user) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Parametre kullanımın yanlış. Doğrusu:
                    \`${client.settings.prefix}unban [etiket/id]\``,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })

        message.guild.members.unban(user).then(() => client.logger.announce({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Başarıyla yasağı kaldırıldı!`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })).catch(err => client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Kullanıcının yasağı kaldırılamadı.`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        }))
    }
}