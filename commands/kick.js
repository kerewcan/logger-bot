module.exports = {
    settings: { name: "kick", category: "admin" },
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
                    \`${client.settings.prefix}kick [etiket/id] (sebep)\``,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })

        if(!message.guild.members.cache.has(user.id)) return client.logger.error({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Kullanıcı sunucuya üye değil!`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })
        user = message.guild.members.cache.get(user.id);

        message.guild.members.kick(user, { reason: reason ?? null })
        
        return client.logger.announce({
            event: message.channelId,
            embeds: [
                {
                    timestamp: true, 
                    description: `Başarıyla kicklendi!`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            ],
            timeout: 10
        })
    }
}