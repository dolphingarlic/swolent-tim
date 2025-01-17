const Discord = require('discord.js');
const config = require('./config');
const breakout = require('./breakout');
const getVerifyLink = require('./verification').getVerifyLink;
const { readFileSync } = require('fs');

/// From https://discordjs.guide/popular-topics/reactions.html#awaiting-reactions
const client = new Discord.Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    disableMentions: 'everyone',
});
const commands = {};
const prefix = 'tim.';

const modules = ['commands', 'confessions', 'starboard', 'verification'];

client.on('ready', () => {
    for (const module of modules) {
        const cmds = require('./' + module).setup(client, config);
        if (!cmds) {
            continue;
        }
        for (const cmd of cmds) {
            const name = cmd.name.toLowerCase();
            if (cmd.unprefixed) {
                commands[name] = cmd.call;
            }
            commands[prefix + name] = cmd.call;
        }
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    const args = msg.content.split(' ');
    const commandName = args[0].toLowerCase();
    const command = commands[commandName];
    if (command) {
        command(msg, args, client);
    }
});

// TODO: move this into new module system
client.on('guildMemberUpdate', (oldMember, newMember) => {
    const guild = client.guilds.cache.get(config.guild_2025);

    const wasGivenRole = role => !oldMember.roles.cache.get(role) && newMember.roles.cache.get(role);

    if (newMember.guild == guild) {
        if (wasGivenRole(config.verification.verified_role)) {
            const channel = guild.channels.cache.get(config.welcome_channel);
            const user = newMember.user;
            channel.send(`${user}, welcome to MIT '25! Please head over to <#783439183888384031> to get tags for pronouns, regions, etc., and if you're new to Discord, <#789592290518892545> will explain how to use this platform! Then you can introduce yourself in <#783438962756288529>. Congratulations again! <:bbydab:784988174647558145> :confetti_ball:\n\nP.S. We have some special guests here (current students and folks from the admissions office)! Say hi in <#783818929961173002> or in this channel :smile: (the server is still ours tho, they can only access the Boomer chats, not all other chats for their own safety)!!`);
        }
        if (wasGivenRole(config.breakout_unassigned_role) && !oldMember.roles.cache.get(config.breakout_assigned_role)) {
            breakout.assignToRoom(newMember.user.id, guild);
        }
    }
});

client.on('guildMemberAdd', member => {
    member.send(`Hi! I'm Tim. In order to get verified as a member of the class of 2025, please click on the following link:

${getVerifyLink(member.id)}

Once you're in the server, please check out #rules-n-how-to-discord, get roles in #roles, and don't forget to introduce yourself to your fellow adMITs in #introductions!`);
});

const token_thunks = [
    () => process.env["BOT_TOKEN"],
    () => readFileSync("token.txt"),
    () => require('./token'),
];

const get_token = function () {
    for (const thunk of token_thunks) {
        try {
            const value = thunk();
            if (value) {
                return value.toString().trim();
            }
        } catch (e) { }
    }
    throw new Error("Could not find token! Searched in the following locations: $BOT_TOKEN, token.txt, token.js");
}

client.login(get_token());
