module.exports = {
    settings: { name: "bakım", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args: [mod] }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        const categories = ['1115413731409657906','1115468872108228608','1115412486921928704','1115412822948577350','1115451923454246982','1115462040677531648','1115462060499804190','1115464869341310998'].map(id => message.guild.channels.cache.get(id))
        const bakimCategory = message.guild.channels.cache.filter(channel => channel.type == 4).find(category => category.id == "1116759905290965074")
        if(mod == "aç") {
            categories.forEach(channel => channel.permissionOverwrites.edit('1116132537564155914', { ViewChannel: false }))
            message.guild.channels.cache.get('1116135447312203806').permissionOverwrites.edit(message.guild.id, { ViewChannel: false })
            message.guild.channels.cache.get('1116135466299826186').permissionOverwrites.edit(message.guild.id, { ViewChannel: false })
            message.guild.channels.cache.get('1115413731409657906').permissionOverwrites.edit(message.guild.id, { ViewChannel: false })
            bakimCategory.permissionOverwrites.edit(message.guild.id, { ViewChannel: true });
            return client.logger.announce({
                event: message.channelId,
                embeds: [
                    {
                        timestamp: true, 
                        description: `Bakım Modu başarıyla açıldı!`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ],
                timeout: 5
            })
        } else if(mod == "kapat") {
            categories.forEach(channel => channel.permissionOverwrites.edit('1116132537564155914', { ViewChannel: true }))
            message.guild.channels.cache.get('1116135447312203806').permissionOverwrites.edit(message.guild.id, { ViewChannel: true })
            message.guild.channels.cache.get('1116135466299826186').permissionOverwrites.edit(message.guild.id, { ViewChannel: true })
            message.guild.channels.cache.get('1115413731409657906').permissionOverwrites.edit(message.guild.id, { ViewChannel: true })
            bakimCategory.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
            return client.logger.announce({
                event: message.channelId,
                embeds: [
                    {
                        timestamp: true, 
                        description: `Bakım Modu başarıyla kapatıldı!`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ],
                timeout: 5
            })
        }
    }
}