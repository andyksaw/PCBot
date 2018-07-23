const fs = require('fs');
const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request-promise-native')

if (!fs.existsSync('config.json')) {
    console.error('Failed to launch: config.json not found')
    return
}

const configData = fs.readFileSync('config.json')
const config = JSON.parse(configData)

const token = config.bot_token
if (token === null || token === '') {
    console.error('Failed to launch: No token set in config.json file')
    return
}

client.on('ready', () => {
    console.log('Connected: PCBot initialised')

    const availableRoles = client.guilds.first().roles
    availableRoles.forEach(role => {
        console.log({
            id: role.id,
            name: role.name,
        })
    })
})

client.on('message', msg => {
    if (msg.content === '!pcb ping') {
        msg.react('🤖')
        msg.reply('pong')
    }

    if (msg.content === '!pcb sync') {
        msg.react('🤖')

        request.post('https://projectcitybuild.com/api/discord/sync', {
            form: {
                discord_id: msg.member.id,
            },
        })
        .then(response => {
            let json = JSON.parse(response)
            if (json.data.account === null) {
                msg.reply("You haven't linked your Discord account yet. Please login and then access https://projectcitybuild.com/account/social")
                msg.react('❌')
                return
            }

            let groups = json.data.discourse.groups

            const currentRoles = msg.member.roles.array().map(role => { return role.guild.id })
            console.log(currentRoles)
            msg.member.removeRoles(currentRoles)
                .catch (error => {
                    console.log(error)

                    msg.reply('I appear to be missing server permissions...')
                    msg.react('🔥')
                })

            const rolesToAdd = new Set()

            groups.forEach(group => {
                switch (group.name) {
                    case 'donator':
                        rolesToAdd.add(config.roles.donator)
                        break

                    case 'administrator':
                        rolesToAdd.add(config.roles.admin)
                        break

                    case 'senior-operator':
                        rolesToAdd.add(config.roles.sop)
                        break

                    case 'operator':
                        rolesToAdd.add(config.roles.op)
                        break

                    case 'moderator':
                        rolesToAdd.add(config.roles.mod)
                        break

                    case 'trusted':
                        rolesToAdd.add(config.roles.trusted)
                        break
                }
            });

            if (rolesToAdd.size > 0) {
                console.log([...rolesToAdd])
                msg.member.addRoles([...rolesToAdd])
                    .then(() => {
                        msg.react('✅')
                    })
                    .catch(error => {
                        console.log(error)

                        msg.reply('Sorry, I failed to add a role to your Discord account')
                        msg.react('🔥')
                    })
            }
        })
        .catch(error => {
            console.error(`Failed to fetch data: ${error}`)

            msg.reply('Sorry, I failed to connect to PCB')
            msg.react('🔥')
        })
    }
})

client.login(token)
    .catch(error => {
        console.log(`Login failed: ${error}`)
    })