const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setChannelLock } = require('../utils/channelLock');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so @everyone cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to lock (defaults to this one)'))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for locking')),

  async execute(interaction) {
    return setChannelLock(interaction, { locking: true });
  },
};
