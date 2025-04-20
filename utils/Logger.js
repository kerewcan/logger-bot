const { EmbedBuilder, Collection, AuditLogEvent } = require('discord.js');
const DiscordLogs = require('discord-logs');
const flatten = require('flat')

function clean(text) {
    if (typeof(text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203));
    else return text;
}

function chunkString(str, len) {
    const size = Math.ceil(str.length/len)
    const r = Array(size)
    let offset = 0

    for (let i = 0; i < size; i++) {
        r[i] = str.substr(offset, len)
        offset += len
    }

    return r
}

Object.defineProperty(Array.prototype, 'chunk', { value: function(n) { return Array(Math.ceil(this.length/n)).fill().map((_,i) => this.slice(i*n,i*n+n)); }});

class Logger {
    constructor({ client, guild, channels, emoteRoleSettings, colors = { success: "#57F287", error: "#ED4245", information: "#5865F2", warning: "#FEE75C", announce: "#EB459E", white: "#FFFFFF", black: "#000000" } } = {}) {
        if(!client) throw 'You must describe your bot\'s Discord Client.';
        DiscordLogs(client);
        client.logger = this;
        client.invites = new Collection();
        this.client = client;
        this.guildId = guild;
        this.channel = {};
        this.channels = flatten(channels);
        this.emoteRoleSettings = emoteRoleSettings || {
            roles: [],
            emote: "💀"
        };
        this.colors = colors;

        Object.entries(this.colors).forEach(([fnName, color]) => {
            this[fnName] = async ({ event, message, embeds, timeout } = {}) => {
                var embedsToSend = [];
                embeds.forEach(settings => {
                    if(typeof settings !== "object") throw 'Settings must be Object.';
                    const embed = new EmbedBuilder().setColor(color)
                    this.#handleEmbed(embed, settings);
                    embedsToSend.push(embed)
                })
                const sentMessage = await this.client.channels.cache.get(this.channels[event] || event).send({ content: message ?? null, embeds: embedsToSend }).catch(console.error);
                if(timeout) setTimeout(() => sentMessage.delete(), timeout * 1000);
                return sentMessage;
            }
        });
        
        const wait = require("timers/promises").setTimeout;

        client.on("ready", async () => {
            await wait(1000);

            if(client.database.has('emoteRole.channel') && client.database.get('emoteRole.channel') == this.emoteRoleSettings.channelId && client.channels.cache.has(client.database.get('emoteRole.channel'))) {
                this.channel = await client.channels.cache.get(client.database.get('emoteRole.channel'));
                if(client.database.has('emoteRole.messageId')) this.channel.messages.fetch(client.database.get('emoteRole.messageId'));
            } else {
                this.channel = await client.channels.cache.get(this.emoteRoleSettings.channelId);
                if(this.channel) {
                    const message = await this.channel.send('Aşağıda bulunan butona tıklayarak sunucumuza kayıt olabilirsiniz.');
                    await message.react(this.emoteRoleSettings.emote)
                    client.database.set('emoteRole', { channel: this.channel.id, messageId: message.id })
                }
            }

            client.guilds.cache.forEach(async (guild) => {
                const firstInvites = await guild.invites.fetch();
                client.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
            });
        });

        client.on("inviteDelete", async (invite) => {
            client.invites.get(invite.guild.id).delete(invite.code);
        });

        client.on("inviteCreate", async (invite) => {
            client.invites.get(invite.guild.id).set(invite.code, invite.uses);
        });

        client.on("guildCreate", async (guild) => {
            guild.invites.fetch().then(guildInvites => {
                client.invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
            })
        });

        client.on("guildDelete", async (guild) => {
            client.invites.delete(guild.id);
        });

        client.on("guildMemberAdd", async (member) => {
            const newInvites = await member.guild.invites.fetch()
            const oldInvites = client.invites.get(member.guild.id);
            const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
            const inviter = invite ? await client.users.fetch(invite.inviter.id) : null;

            client.logger.information({ 
                event: "guildMemberVanity",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: inviter ? `Sunucuya [${invite.code}](https://discord.gg/${invite.code}) daveti ile giriş yaptı.
                        Davet Eden: ${inviter.username}${inviter.discriminator !== '0' ? "#" + inviter.discriminator : ""} <@${inviter.id}> **(${inviter.id})**.

                        <t:${Math.floor(Date.now() / 1000)}:F>` 
                        : `Sunucuya giriş yaptı ama hangi davet kodu ile giriş yaptığını bulamadım.

                        <t:${Math.floor(Date.now() / 1000)}:F>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
            return client.logger.success({ 
                event: "guildMemberAdd",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `Sunucuya girdi.
                        <t:${Math.floor(Date.now() / 1000)}:F>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("guildMemberRemove", async (member) => {
            return client.logger.error({ 
                event: "guildMemberRemove",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `Sunucudan çıktı.
                        <t:${Math.floor(Date.now() / 1000)}:F>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on('messageCreate', async (message) => {
            if(message.system) return;
            if(message.author.id == client.user.id) return;
            var content = chunkString(clean(message.content), 1800);
            var firstContent = content.shift();
            var embeds = [
                {
                    timestamp: true,
                    author: { name: `${message.author.username}${message.author.discriminator !== '0' ? "#" + message.author.discriminator : ""}`, iconURL: message.author.displayAvatarURL() },
                    description: `Mesajın Atıldığı Kanal: <#${message.channelId}>
                    **Mesaj İçeriği: **
                    ${firstContent !== "" ? firstContent : "*Mesaj İçeriği Bulunmuyor*"}
    
                    ${message.url}`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }, ...content.map(content => {
                    return {
                        timestamp: true,
                        description: `**Mesaj Devamı: **
                        ${content !== "" ? content : "*Mesaj İçeriği Bulunmuyor*"}
        
                        ${message.url}`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                })
            ]

            embeds = embeds.chunk(2)
            embeds.forEach(embeds => {
                client.logger.success({ 
                    event: "messageCreate",
                    embeds
                })
            })
            return;
        })

        client.on('messageDelete', async (message) => {
            if(message.author.id == client.user.id) return;
            var content = chunkString(clean(message.content), 1800);
            var firstContent = content.shift();
            var embeds = [
                {
                    timestamp: true,
                    author: { name: `${message.author.username}${message.author.discriminator !== '0' ? "#" + message.author.discriminator : ""}`, iconURL: message.author.displayAvatarURL() },
                    description: `Mesajın Silindiği Kanal: <#${message.channelId}>
                    **Mesaj İçeriği: **
                    ${firstContent !== "" ? firstContent : "*Mesaj İçeriği Bulunmuyor*"}`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }, ...content.map(content => {
                    return {
                        timestamp: true,
                        description: `**Mesaj Devamı: **
                        ${content !== "" ? content : "*Mesaj İçeriği Bulunmuyor*"}
        
                        ${message.url}`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                })
            ];

            embeds = embeds.chunk(2)
            embeds.forEach(embeds => {
                client.logger.error({ 
                    event: "messageDelete",
                    embeds
                })
            })
            return;
        })

        client.on('messageUpdate', async (oldMessage, message) => {
            if(message.author.id == client.user.id) return;
            var oldContent = chunkString(clean(oldMessage.content), 1800);
            var firstOldContent = oldContent.shift();
            var content = chunkString(clean(message.content), 1800);
            var firstContent = content.shift();
            var embeds = [{
                timestamp: true,
                author: { name: `${message.author.username}${message.author.discriminator !== '0' ? "#" + message.author.discriminator : ""}`, iconURL: message.author.displayAvatarURL() },
                description: `Mesajın Düzenlendiği Kanal: <#${message.channelId}>
                **Eski Mesaj İçeriği: **
                ${firstOldContent !== "" ? firstOldContent : "*Mesaj İçeriği Bulunmuyor*"}`,
                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
            }, ...oldContent.map(content => {
                return {
                    timestamp: true,
                    description: `**Eski Mesaj Devamı: **
                    ${content !== "" ? content : "*Mesaj İçeriği Bulunmuyor*"}`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            }), 
            {
                timestamp: true,
                description: `**Yeni Mesaj İçeriği: **
                ${firstContent !== "" ? firstContent : "*Mesaj İçeriği Bulunmuyor*"}`,
                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
            }, ...content.map(content => {
                return {
                    timestamp: true,
                    description: `**Yeni Mesaj Devamı: **
                    ${content !== "" ? content : "*Mesaj İçeriği Bulunmuyor*"}
    
                    ${message.url}`,
                    footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                }
            })]

            embeds = embeds.chunk(2)
            embeds.forEach(embeds => {
                client.logger.information({ 
                    event: "messageUpdate",
                    embeds
                })
            })
            return; 
        })

        client.on("voiceChannelJoin", (member, channel) => {
            client.logger.success({ 
                event: "voiceChannelJoin",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `<#${channel.id}> kanalına giriş yaptı.
                        <t:${Math.floor(Date.now() / 1000)}:R>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("voiceChannelLeave", (member, channel) => {
            client.logger.error({ 
                event: "voiceChannelLeave",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `<#${channel.id}> kanalından çıkış yaptı.
                        <t:${Math.floor(Date.now() / 1000)}:R>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("voiceChannelSwitch", (member, oldChannel, newChannel) => {
            client.logger.information({ 
                event: "voiceChannelSwitch",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `<#${oldChannel.id}> kanalından <#${newChannel.id}> kanalına geçiş yaptı.
                        <t:${Math.floor(Date.now() / 1000)}:R>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("guildMemberRoleAdd", async (member, role) => {
            client.logger.success({ 
                event: "guildMemberRoleAdd",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `Kullanıcıya <@&${role.id}> rolü verildi.

                        <t:${Math.floor(Date.now() / 1000)}:F>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("guildMemberRoleRemove", async (member, role) => {
            client.logger.error({ 
                event: "guildMemberRoleRemove",
                embeds: [
                    {
                        timestamp: true,
                        author: { name: `${member.user.username}${member.user.discriminator !== '0' ? "#" + member.user.discriminator : ""}`, iconURL: member.user.displayAvatarURL() },
                        description: `Kullanıcıdan <@&${role.id}> rolü alındı.

                        <t:${Math.floor(Date.now() / 1000)}:F>`,
                        footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                    }
                ]
            })
        });

        client.on("guildAuditLogEntryCreate", async ({ action, extra, executor, target, changes, reason }, guild) => {
            if(guild.id !== this.guildId) return;
            if (action == AuditLogEvent.MemberMove) {
                if(executor == null) return;
                if(extra == null || extra.channel == null) return;
                client.logger.information({ 
                    event: "voiceChannelSwitch",
                    embeds: [
                        {
                            timestamp: true,
                            author: { name: `${executor.username}${executor.discriminator !== '0' ? "#" + executor.discriminator : ""}`, iconURL: executor.displayAvatarURL() },
                            description: `<@${executor.id}>, birisini <#${extra.channel.id}> kanalına taşıdı.

                            <t:${Math.floor(Date.now() / 1000)}:R>`,
                            footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                        }
                    ]
                })
            } else if(action == AuditLogEvent.MemberKick) {
                if(executor == null) return;
                if(target == null) return;
                client.logger.information({ 
                    event: "memberKick",
                    embeds: [
                        {
                            timestamp: true,
                            author: { name: `${executor.username}${executor.discriminator !== '0' ? "#" + executor.discriminator : ""}`, iconURL: executor.displayAvatarURL() },
                            description: `<@${executor.id}>, <@${target.id}> **(${target.id})** isimli kullanıcıyı ${reason !== null ? `\`${clean(reason)}\` sebebiyle ` : ""}sunucudan attı.

                            <t:${Math.floor(Date.now() / 1000)}:R>`,
                            footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                        }
                    ]
                })
            } else if(action == AuditLogEvent.MemberBanAdd) {
                if(executor == null) return;
                if(target == null) return;
                client.logger.information({ 
                    event: "memberBanAdd",
                    embeds: [
                        {
                            timestamp: true,
                            author: { name: `${executor.username}${executor.discriminator !== '0' ? "#" + executor.discriminator : ""}`, iconURL: executor.displayAvatarURL() },
                            description: `<@${executor.id}>, <@${target.id}> **(${target.id})** isimli kullanıcıyı ${reason !== null ? `\`${clean(reason)}\` sebebiyle ` : ""}sunucudan yasakladı.

                            <t:${Math.floor(Date.now() / 1000)}:R>`,
                            footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                        }
                    ]
                })
            } else if(action == AuditLogEvent.MemberBanRemove) {
                if(executor == null) return;
                if(target == null) return;
                client.logger.information({ 
                    event: "memberBanRemove",
                    embeds: [
                        {
                            timestamp: true,
                            author: { name: `${executor.username}${executor.discriminator !== '0' ? "#" + executor.discriminator : ""}`, iconURL: executor.displayAvatarURL() },
                            description: `<@${executor.id}>, <@${target.id}> **(${target.id})** isimli kullanıcının yasağını sunucudan kaldırdı.

                            <t:${Math.floor(Date.now() / 1000)}:R>`,
                            footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                        }
                    ]
                })
            } else if(action == AuditLogEvent.MemberUpdate) {
                if(executor == null) return;
                if(target == null) return;
                if(changes.some(change => change.key == "nick")) {
                    const change = changes.find(change => change.key == "nick")
                    client.logger.information({ 
                        event: "guildMemberNicknameUpdate",
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""}`, iconURL: target.displayAvatarURL() },
                                description: `Kullanıcının ismi <@${executor.id}> tarafından değiştirildi.
                                **Eski:** ${change.old ?? target.username},
                                **Yeni:** ${change.new ?? guild.members.cache.get(target.id).displayName}
        
                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                } else if(changes.some(change => change.key == "mute")) {
                    const change = changes.find(change => change.key == "mute")
                    client.logger.information({ 
                        event: "guildMemberMute",
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""}`, iconURL: target.displayAvatarURL() },
                                description: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""} **(${target.id})** isimli kullanıcı${change.old == false && change.new == true ? `, <@${executor.id}> tarafından susturuldu.` : `nın susturması <@${executor.id}> tarafından kaldırıldı.`}
        
                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                } else if(changes.some(change => change.key == "deaf")) {
                    const change = changes.find(change => change.key == "deaf")
                    client.logger.information({ 
                        event: "guildMemberDeaf",
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""}`, iconURL: target.displayAvatarURL() },
                                description: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""} **(${target.id})** isimli kullanıcının ${change.old == false && change.new == true ? `kulaklığı <@${executor.id}> tarafından kapatıldı.` : `kulaklığı <@${executor.id}> tarafından açıldı.`}
        
                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                } else if(changes.some(change => change.key == "communication_disabled_until")) {
                    const change = changes.find(change => change.key == "communication_disabled_until")
                    client.logger.information({ 
                        event: "guildMemberTimeout",
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""}`, iconURL: target.displayAvatarURL() },
                                description: `${target.username}${target.discriminator !== '0' ? "#" + target.discriminator : ""} **(${target.id})** isimli kullanıcı${(!change.old && change.new) || (change.old && change.new) ? `, <@${executor.id}> tarafından timeouta atıldı.` : `nın timeoutu <@${executor.id}> tarafından kaldırıldı.`}
        
                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                }
            }
        })

        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch(); 
            if (reaction.partial) await reaction.fetch();
            if (user.bot) return; 
            if (!reaction.message.guild) return; 
            if(reaction.message.guild.id !== this.guildId) return;

            if (reaction.message.channel.id === this.channel.id) { //Kanal idnizi sola girin
                if (reaction.emoji.name === this.emoteRoleSettings.emote) {
                    await reaction.message.guild.members.cache.get(user.id).roles.set(Array.from(new Set([].concat(reaction.message.guild.members.cache.get(user.id).roles.cache.map(r=>r.id), this.emoteRoleSettings.roles)))) // İstediğiniz Rol idsini girin
                    return client.logger.information({ 
                        event: this.emoteRoleSettings.guildMemberEmoteRoleAdd,
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${user.username}${user.discriminator !== '0' ? "#" + user.discriminator : ""}`, iconURL: user.displayAvatarURL() },
                                description: `${user.username}${user.discriminator !== '0' ? "#" + user.discriminator : ""} **(${user.id})** isimli kullanıcı emojiye tıklayarak ${this.emoteRoleSettings.roles.map(r => `<@&${r}>`).join(', ')} rolünü/rollerini aldı.

                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                }
            }
            return;
        })

        client.on("messageReactionRemove", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch(); 
            if (reaction.partial) await reaction.fetch();
            if (user.bot) return; 
            if (!reaction.message.guild) return; 
            if(reaction.message.guild.id !== this.guildId) return;

            if (reaction.message.channel.id === this.channel.id) { //Kanal idnizi sola girin
                if (reaction.emoji.name === this.emoteRoleSettings.emote) {
                    await reaction.message.guild.members.cache.get(user.id).roles.set(reaction.message.guild.members.cache.get(user.id).roles.cache.map(r=>r.id).filter(v => !this.emoteRoleSettings.roles.includes(v))) // İstediğiniz Rol idsini girin
                    return client.logger.information({ 
                        event: this.emoteRoleSettings.guildMemberEmoteRoleRemove,
                        embeds: [
                            {
                                timestamp: true,
                                author: { name: `${user.username}${user.discriminator !== '0' ? "#" + user.discriminator : ""}`, iconURL: user.displayAvatarURL() },
                                description: `${user.username}${user.discriminator !== '0' ? "#" + user.discriminator : ""} **(${user.id})** isimli kullanıcı emojiye tıklayarak ${this.emoteRoleSettings.roles.map(r => `<@&${r}>`).join(', ')} rolünü/rollerini bıraktı.

                                <t:${Math.floor(Date.now() / 1000)}:F>`,
                                footer: { text: "Logger", iconURL: client.user.displayAvatarURL() }
                            }
                        ]
                    })
                }
            }
            return;
        })
    }

    #handleEmbed(embed, { title, footer, timestamp, url, author, thumbnail, image, description, fields = [] } = {}) {
        if(title) embed.setTitle(title);
        if(description) embed.setDescription(description);
        if(fields.length > 0) embed.addFields(fields);
        if(thumbnail) embed.setThumbnail(thumbnail);
        if(author) embed.setAuthor(author);
        if(url) embed.setURL(url);
        if(timestamp) embed.setTimestamp();
        if(image) embed.setImage(image);
        if(footer) embed.setFooter(footer);
        return embed;
    }
}

module.exports = Logger;