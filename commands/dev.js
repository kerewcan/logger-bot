module.exports = {
    settings: { name: "dev", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        client.settings.devMode = !client.settings.devMode;
        return message.channel.send('Ayarlandı')
    }
}