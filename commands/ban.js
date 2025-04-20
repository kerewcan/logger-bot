module.exports = {
    settings: { name: "ban", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args: [user, reason] }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        var user = message.mentions.users.first() || (user && await client.users.fetch(user).catch(() => undefined))
        if(!user) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Parametre kullanımın yanlış. Doğrusu:
                    \`${client.settings.prefix}ban [etiket/id] (sebep)\``,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })

        message.guild.members.ban(user, { reason: reason ?? null })
        
        return client.logger.announce({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Başarıyla banlandı!`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })
    }
}