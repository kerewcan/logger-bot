const { inspect } = require('node:util');

module.exports = {
    settings: { name: "eval", category: "admin" },
    onLoad: async (client) => {},
    run: async ({ client, message, args }) => {
        if(!client.settings.owners.includes(message.author.id)) return;
        new Promise((resolve, reject) => resolve(eval(args.join(" ")))).then((output) => {
            if(typeof output !== "string") {
                output = inspect(output, { compact: false, depth: 0, breakLength: 80 }); 
                output = clean(output);
            }
            return message.channel.send("```js\n"+output+"```").catch(err => { console.info(output); message.channel.send('mesaj 2000 karakterden büyük, konsola logladım.') })
        }).catch(err => {
            var error = clean(err)
            console.error(error)
            return message.channel.send("```js\n"+error+"```")
        })
    }
}

function clean(text) {
    if (typeof(text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
    else return text;
}