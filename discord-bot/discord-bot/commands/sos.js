const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../utils/duration');
const core = require('../utils/giveawayCore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sos')
    .setDescription('Split or Steal giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Start a Split or Steal giveaway (always 2 winners)')
        .addStringOption((opt) => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('How long it runs, e.g. 30m, 2h, 1d').setRequired(true)
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post the giveaway in'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'create') return;

    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 10_000) {
      return interaction.reply({
        content: 'Please provide a valid duration of at least 10 seconds, e.g. `30m`, `2h`, `1d`.',
        ephemeral: true,
      });
    }

    const { message } = await core.createGiveaway(channel, {
      prize,
      durationMs,
      winnerCount: 2,
      mode: core.MODES.SPLIT_STEAL,
      hostId: interaction.user.id,
      guildId: interaction.guildId,
    });

    return interaction.reply({
      content:
        `🤝🔪 Split or Steal giveaway for **${prize}** started in ${channel} — ends in ${formatDuration(durationMs)}. ` +
        `The 2 winners will choose to Split or Steal when it ends. (ID: \`${message.id}\`)`,
      ephemeral: true,
    });
  },
};
