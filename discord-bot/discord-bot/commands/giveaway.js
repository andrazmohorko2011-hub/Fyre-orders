const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../utils/duration');
const storage = require('../utils/storage');
const core = require('../utils/giveawayCore');
const games = require('../utils/games');

module.exports = {
  // Re-exported for index.js and other commands that need them.
  GIVEAWAY_ENTER_ID: core.GIVEAWAY_ENTER_ID,
  buildEnterRow: core.buildEnterRow,
  endGiveaway: core.endGiveaway,
  startGiveawayScheduler: core.startGiveawayScheduler,

  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new (classic) giveaway. For Split or Steal / Double or Keep, use /sos or /dok.')
        .addStringOption((opt) => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('How long it runs, e.g. 30m, 2h, 1d').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20)
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post the giveaway in'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for an ended giveaway')
        .addStringOption((opt) => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of new winners to pick').setMinValue(1))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active giveaways in this server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnerCount = interaction.options.getInteger('winners') ?? 1;
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
        winnerCount,
        mode: core.MODES.CLASSIC,
        hostId: interaction.user.id,
        guildId: interaction.guildId,
      });

      return interaction.reply({
        content: `🎉 Giveaway for **${prize}** started in ${channel} — ends in ${formatDuration(durationMs)}. (ID: \`${message.id}\`)`,
        ephemeral: true,
      });
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const giveaways = storage.load('giveaways', {});
      const record = giveaways[messageId];
      if (!record || record.guildId !== interaction.guildId) {
        return interaction.reply({ content: 'No active giveaway found with that message ID.', ephemeral: true });
      }
      if (record.ended) {
        return interaction.reply({ content: 'That giveaway has already ended.', ephemeral: true });
      }
      await interaction.reply({ content: 'Ending giveaway now...', ephemeral: true });
      await core.endGiveaway(interaction.client, { messageId });
      return;
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const newWinnerCount = interaction.options.getInteger('winners');
      const giveaways = storage.load('giveaways', {});
      const record = giveaways[messageId];
      if (!record || record.guildId !== interaction.guildId) {
        return interaction.reply({ content: 'No giveaway found with that message ID.', ephemeral: true });
      }
      if (!record.ended) {
        return interaction.reply({ content: 'That giveaway has not ended yet.', ephemeral: true });
      }
      const entrants = record.entrants || [];
      const winners = core.pickWinners(entrants, newWinnerCount ?? record.winnerCount);
      record.winners = winners;
      giveaways[messageId] = record;
      storage.save('giveaways', giveaways);

      if (!winners.length) {
        return interaction.reply(`No entrants to reroll for **${record.prize}**.`);
      }

      await interaction.reply({ content: 'Rerolling...', ephemeral: true });

      const mode = record.mode || core.MODES.CLASSIC;
      if (mode !== core.MODES.CLASSIC) {
        const channel = await interaction.client.channels.fetch(record.channelId);
        const started = await games.startEndGame(channel, {
          mode,
          prize: record.prize,
          winners,
          giveawayMessageId: record.messageId,
          guildId: record.guildId,
          durationMs: record.durationMs,
          hostId: record.hostId,
        });
        if (started) return;
      }

      return interaction.followUp(
        `🎉 New winner(s) for **${record.prize}**: ${winners.map((id) => `<@${id}>`).join(', ')}!`
      );
    }

    if (sub === 'list') {
      const giveaways = storage.load('giveaways', {});
      const active = Object.values(giveaways).filter((g) => g.guildId === interaction.guildId && !g.ended);
      if (!active.length) {
        return interaction.reply({ content: 'There are no active giveaways in this server.', ephemeral: true });
      }
      const lines = active.map(
        (g) =>
          `• **${g.prize}**${g.mode && g.mode !== core.MODES.CLASSIC ? ` (${core.MODE_LABELS[g.mode]})` : ''} — ${g.entrants.length} entries — ends <t:${Math.floor(g.endsAt / 1000)}:R> (ID: \`${g.messageId}\`)`
      );
      const embed = new EmbedBuilder().setTitle('Active Giveaways').setDescription(lines.join('\n')).setColor(0x5865f2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
