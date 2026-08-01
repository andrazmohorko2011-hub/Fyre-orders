const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../utils/duration');
const core = require('../utils/giveawayCore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dok')
    .setDescription('Double or Keep giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Start a Double or Keep giveaway (always 1 winner)')
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
      winnerCount: 1,
      mode: core.MODES.DOUBLE_KEEP,
      hostId: interaction.user.id,
      guildId: interaction.guildId,
    });

    return interaction.reply({
      content:
        `✨ Double or Keep giveaway for **${prize}** started in ${channel} — ends in ${formatDuration(durationMs)}. ` +
        `The winner will choose to Double it (forfeit it, open a bigger giveaway) or Keep it. (ID: \`${message.id}\`)`,
      ephemeral: true,
    });
  },
};
