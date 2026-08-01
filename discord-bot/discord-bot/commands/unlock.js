const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setChannelLock } = require('../utils/channelLock');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to unlock (defaults to this one)'))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unlocking')),

  async execute(interaction) {
    return setChannelLock(interaction, { locking: false });
  },
};
