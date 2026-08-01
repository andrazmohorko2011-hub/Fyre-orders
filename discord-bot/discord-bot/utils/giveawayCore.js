const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('./storage');

const GIVEAWAY_ENTER_ID = 'giveaway_enter';

const MODES = {
  CLASSIC: 'classic',
  SPLIT_STEAL: 'split_steal',
  DOUBLE_KEEP: 'double_keep',
};

const MODE_LABELS = {
  [MODES.CLASSIC]: 'Classic',
  [MODES.SPLIT_STEAL]: 'Split or Steal',
  [MODES.DOUBLE_KEEP]: 'Double or Keep',
};

function pickWinners(entrants, count) {
  const pool = [...entrants];
  const winners = [];
  const winnerCount = Math.min(count, pool.length);
  for (let i = 0; i < winnerCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

function buildGiveawayEmbed({ prize, endsAt, winnerCount, hostId, entrantCount, ended, winners, mode }) {
  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${prize}`)
    .setColor(ended ? 0x2f3136 : 0x5865f2)
    .addFields(
      { name: 'Winners', value: `${winnerCount}`, inline: true },
      { name: 'Entries', value: `${entrantCount}`, inline: true },
      { name: 'Hosted by', value: `<@${hostId}>`, inline: true }
    );

  if (mode && mode !== MODES.CLASSIC) {
    embed.addFields({ name: 'Mode', value: MODE_LABELS[mode], inline: true });
  }

  if (ended) {
    embed.setDescription(
      winners && winners.length
        ? `Winner(s): ${winners.map((id) => `<@${id}>`).join(', ')}`
        : 'No valid entries — no winner could be chosen.'
    );
    embed.setFooter({ text: 'Giveaway ended' });
  } else {
    embed.setDescription(`Click the button below to enter!\nEnds: <t:${Math.floor(endsAt / 1000)}:R>`);
    embed.setFooter({ text: 'Giveaway ends' });
    embed.setTimestamp(endsAt);
  }

  return embed;
}

function buildEnterRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(GIVEAWAY_ENTER_ID)
      .setLabel('🎉 Enter Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

// Creates and posts a new giveaway. Used directly by /giveaway, /sos, /dok,
// and by the Double-or-Keep "double" outcome spawning a follow-up giveaway.
async function createGiveaway(channel, { prize, durationMs, winnerCount, mode, hostId, guildId }) {
  const endsAt = Date.now() + durationMs;
  const embed = buildGiveawayEmbed({
    prize,
    endsAt,
    winnerCount,
    hostId,
    entrantCount: 0,
    ended: false,
    mode,
  });

  const message = await channel.send({ embeds: [embed], components: [buildEnterRow()] });

  const giveaways = storage.load('giveaways', {});
  const record = {
    messageId: message.id,
    channelId: channel.id,
    guildId,
    prize,
    winnerCount,
    mode,
    durationMs,
    hostId,
    endsAt,
    entrants: [],
    ended: false,
  };
  giveaways[message.id] = record;
  storage.save('giveaways', giveaways);

  return { message, record };
}

// Resolves winners for a giveaway that has ended, handling the classic congrats message
// or handing off to a mini-game (Split or Steal / Double or Keep) via utils/games.js.
// Lazily requires games.js to avoid a circular-require issue (games.js also calls back
// into this module to spawn a follow-up giveaway for the "double" outcome).
async function endGiveaway(client, { messageId }) {
  const games = require('./games');
  const giveaways = storage.load('giveaways', {});
  const record = giveaways[messageId];
  if (!record || record.ended) return;

  try {
    const channel = await client.channels.fetch(record.channelId);
    const message = await channel.messages.fetch(record.messageId);
    const entrants = record.entrants || [];
    const winners = pickWinners(entrants, record.winnerCount);

    record.ended = true;
    record.winners = winners;
    giveaways[messageId] = record;
    storage.save('giveaways', giveaways);

    const embed = buildGiveawayEmbed({
      prize: record.prize,
      endsAt: record.endsAt,
      winnerCount: record.winnerCount,
      hostId: record.hostId,
      entrantCount: entrants.length,
      ended: true,
      winners,
      mode: record.mode,
    });

    await message.edit({ embeds: [embed], components: [buildEnterRow(true)] });

    if (!winners.length) {
      await channel.send(`No one entered the giveaway for **${record.prize}**, so no winner was chosen.`);
      return;
    }

    const mode = record.mode || MODES.CLASSIC;
    if (mode !== MODES.CLASSIC) {
      const started = await games.startEndGame(channel, {
        mode,
        prize: record.prize,
        winners,
        giveawayMessageId: record.messageId,
        guildId: record.guildId,
        durationMs: record.durationMs,
        hostId: record.hostId,
      });
      if (started) return; // mini-game message replaces the normal congrats message
    }

    await channel.send(
      `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won **${record.prize}**!`
    );
  } catch (err) {
    console.error('Failed to end giveaway:', err);
  }
}

// Checks storage every 15s for giveaways whose time is up. Called once from index.js.
function startGiveawayScheduler(client) {
  setInterval(() => {
    const giveaways = storage.load('giveaways', {});
    const now = Date.now();
    for (const [messageId, record] of Object.entries(giveaways)) {
      if (!record.ended && record.endsAt <= now) {
        endGiveaway(client, { messageId });
      }
    }
  }, 15 * 1000);
}

module.exports = {
  GIVEAWAY_ENTER_ID,
  MODES,
  MODE_LABELS,
  pickWinners,
  buildGiveawayEmbed,
  buildEnterRow,
  createGiveaway,
  endGiveaway,
  startGiveawayScheduler,
};
