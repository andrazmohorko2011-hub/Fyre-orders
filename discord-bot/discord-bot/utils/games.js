const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('./storage');

// MODES / MODE_LABELS live in giveawayCore.js (single source of truth); re-exported here for convenience.
const { MODES, MODE_LABELS } = require('./giveawayCore');

const GAME_TIMEOUT_MS = 90 * 1000; // 90s for finalists to respond before auto-resolving

const SS_SPLIT = 'ss_split';
const SS_STEAL = 'ss_steal';
const DK_DOUBLE = 'dk_double';
const DK_KEEP = 'dk_keep';

function loadGames() {
  return storage.load('games', {});
}
function saveGames(games) {
  storage.save('games', games);
}

// Doubles the first number found in a prize string ("$10 gift card" -> "$20 gift card").
// Falls back to prefixing "2x" if no number is found.
function doublePrizeLabel(prize) {
  const match = prize.match(/\d+(?:[.,]\d+)?/);
  if (!match) return `2x ${prize}`;
  const num = parseFloat(match[0].replace(',', ''));
  if (Number.isNaN(num)) return `2x ${prize}`;
  const doubled = num * 2;
  const doubledStr = Number.isInteger(doubled) ? `${doubled}` : doubled.toFixed(2);
  return prize.replace(match[0], doubledStr);
}

function buildSplitStealRow(gameId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${SS_SPLIT}:${gameId}`).setLabel('🤝 Split').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`${SS_STEAL}:${gameId}`).setLabel('🔪 Steal').setStyle(ButtonStyle.Danger).setDisabled(disabled)
  );
}

function buildDoubleKeepRow(gameId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${DK_KEEP}:${gameId}`).setLabel('✅ Keep It').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`${DK_DOUBLE}:${gameId}`).setLabel('✨ Double It').setStyle(ButtonStyle.Primary).setDisabled(disabled)
  );
}

// Kicks off a mini-game for a set of giveaway winners. Returns true if it started one
// (caller should NOT also send the normal "congrats" announcement), false to fall through
// to the classic announcement (e.g. not enough winners for the mode).
async function startEndGame(channel, { mode, prize, winners, giveawayMessageId, guildId, durationMs, hostId }) {
  if (mode === MODES.SPLIT_STEAL) {
    if (winners.length < 2) return false;
    const [playerA, playerB] = winners;

    const embed = new EmbedBuilder()
      .setTitle('🤝🔪 Split or Steal!')
      .setColor(0xfee75c)
      .setDescription(
        `<@${playerA}> and <@${playerB}> both won **${prize}**!\n\n` +
          `Each of you must secretly choose to **Split** or **Steal**:\n` +
          `• Both Split → you each get half\n` +
          `• Both Steal → nobody gets anything\n` +
          `• One Splits, one Steals → the one who Split takes it all\n\n` +
          `You have 90 seconds. Only <@${playerA}> and <@${playerB}> can click.`
      );

    const message = await channel.send({ embeds: [embed], components: [buildSplitStealRow('pending')] });
    const gameId = message.id;
    await message.edit({ components: [buildSplitStealRow(gameId)] });

    const games = loadGames();
    games[gameId] = {
      gameId,
      mode: MODES.SPLIT_STEAL,
      channelId: channel.id,
      guildId,
      giveawayMessageId,
      prize,
      players: [playerA, playerB],
      choices: {},
      deadline: Date.now() + GAME_TIMEOUT_MS,
      resolved: false,
    };
    saveGames(games);
    return true;
  }

  if (mode === MODES.DOUBLE_KEEP) {
    if (winners.length < 1) return false;
    const player = winners[0];

    const embed = new EmbedBuilder()
      .setTitle('✨ Double or Keep!')
      .setColor(0xfee75c)
      .setDescription(
        `<@${player}> won **${prize}**!\n\n` +
          `**Keep it** — take the prize, done.\n` +
          `**Double it** — give up your own prize, but a brand new giveaway for **double** the prize opens for everyone.\n\n` +
          `You have 90 seconds. Only <@${player}> can click.`
      );

    const message = await channel.send({ embeds: [embed], components: [buildDoubleKeepRow('pending')] });
    const gameId = message.id;
    await message.edit({ components: [buildDoubleKeepRow(gameId)] });

    const games = loadGames();
    games[gameId] = {
      gameId,
      mode: MODES.DOUBLE_KEEP,
      channelId: channel.id,
      guildId,
      giveawayMessageId,
      prize,
      durationMs,
      hostId,
      players: [player],
      choices: {},
      deadline: Date.now() + GAME_TIMEOUT_MS,
      resolved: false,
    };
    saveGames(games);
    return true;
  }

  return false;
}

async function resolveSplitSteal(client, game) {
  const games = loadGames();
  const record = games[game.gameId];
  if (!record || record.resolved) return;

  const [a, b] = record.players;
  // No response in time defaults to Steal — silence carries the same risk as choosing it.
  const choiceA = record.choices[a] || 'steal';
  const choiceB = record.choices[b] || 'steal';

  record.resolved = true;
  games[game.gameId] = record;
  saveGames(games);

  let resultText;
  if (choiceA === 'split' && choiceB === 'split') {
    resultText = `🤝 Both players **Split**! <@${a}> and <@${b}> each walk away with half of **${record.prize}**.`;
  } else if (choiceA === 'steal' && choiceB === 'steal') {
    resultText = `💥 Both players **Stole**! Nobody gets **${record.prize}**.`;
  } else {
    // Mixed choice: the player who Split takes everything; the one who Stole gets nothing.
    const splitter = choiceA === 'split' ? a : b;
    const stealer = choiceA === 'split' ? b : a;
    resultText = `🤝 <@${splitter}> Split while <@${stealer}> tried to Steal! <@${splitter}> takes all of **${record.prize}**.`;
  }

  try {
    const channel = await client.channels.fetch(record.channelId);
    const message = await channel.messages.fetch(record.gameId);
    const revealEmbed = new EmbedBuilder()
      .setTitle('🤝🔪 Split or Steal — Result')
      .setColor(0x2f3136)
      .setDescription(
        `<@${a}> chose **${choiceA === 'split' ? 'Split' : 'Steal'}**\n` +
          `<@${b}> chose **${choiceB === 'split' ? 'Split' : 'Steal'}**\n\n${resultText}`
      );
    await message.edit({ embeds: [revealEmbed], components: [buildSplitStealRow(record.gameId, true)] });
  } catch (err) {
    console.error('Failed to reveal Split or Steal result:', err);
  }
}

async function resolveDoubleKeep(client, game) {
  const giveawayCore = require('./giveawayCore');
  const games = loadGames();
  const record = games[game.gameId];
  if (!record || record.resolved) return;

  const player = record.players[0];
  // No response in time defaults to the safe choice: Keep.
  const choice = record.choices[player] || 'keep';

  record.resolved = true;
  games[game.gameId] = record;
  saveGames(games);

  let resultText;
  try {
    const channel = await client.channels.fetch(record.channelId);

    if (choice === 'keep') {
      resultText = `✅ <@${player}> chose to **Keep** — walking away with **${record.prize}**.`;
    } else {
      const doubledPrize = doublePrizeLabel(record.prize);
      resultText =
        `✨ <@${player}> chose to **Double it**! They gave up their prize — but a brand new giveaway ` +
        `for **${doubledPrize}** is now open for everyone!`;
    }

    const message = await channel.messages.fetch(record.gameId);
    const revealEmbed = new EmbedBuilder()
      .setTitle('✨ Double or Keep — Result')
      .setColor(0x2f3136)
      .setDescription(resultText);
    await message.edit({ embeds: [revealEmbed], components: [buildDoubleKeepRow(record.gameId, true)] });

    if (choice === 'double') {
      const doubledPrize = doublePrizeLabel(record.prize);
      const durationMs = record.durationMs || 24 * 60 * 60 * 1000; // fall back to 24h if missing
      await giveawayCore.createGiveaway(channel, {
        prize: doubledPrize,
        durationMs,
        winnerCount: 1,
        mode: MODES.CLASSIC,
        hostId: record.hostId,
        guildId: record.guildId,
      });
    }
  } catch (err) {
    console.error('Failed to reveal Double or Keep result:', err);
  }
}

// Handles a button click for either mini-game. Returns true if it handled the interaction.
async function handleGameButton(interaction) {
  const [action, gameId] = interaction.customId.split(':');
  if (![SS_SPLIT, SS_STEAL, DK_DOUBLE, DK_KEEP].includes(action)) return false;

  const games = loadGames();
  const record = games[gameId];
  if (!record) {
    await interaction.reply({ content: 'This game no longer exists.', ephemeral: true });
    return true;
  }
  if (record.resolved) {
    await interaction.reply({ content: 'This game has already been resolved.', ephemeral: true });
    return true;
  }
  if (!record.players.includes(interaction.user.id)) {
    await interaction.reply({ content: "This isn't your choice to make!", ephemeral: true });
    return true;
  }
  if (record.choices[interaction.user.id]) {
    await interaction.reply({ content: 'You already made your choice.', ephemeral: true });
    return true;
  }

  if (action === SS_SPLIT) record.choices[interaction.user.id] = 'split';
  if (action === SS_STEAL) record.choices[interaction.user.id] = 'steal';
  if (action === DK_KEEP) record.choices[interaction.user.id] = 'keep';
  if (action === DK_DOUBLE) record.choices[interaction.user.id] = 'double';

  games[gameId] = record;
  saveGames(games);

  await interaction.reply({ content: 'Your choice has been locked in.', ephemeral: true });

  const allChosen = record.players.every((id) => record.choices[id]);
  if (allChosen) {
    if (record.mode === MODES.SPLIT_STEAL) await resolveSplitSteal(interaction.client, { gameId });
    if (record.mode === MODES.DOUBLE_KEEP) await resolveDoubleKeep(interaction.client, { gameId });
  }
  return true;
}

// Checks every 15s for games past their deadline and auto-resolves them with default choices.
function startGameScheduler(client) {
  setInterval(() => {
    const games = loadGames();
    const now = Date.now();
    for (const [gameId, record] of Object.entries(games)) {
      if (!record.resolved && record.deadline <= now) {
        if (record.mode === MODES.SPLIT_STEAL) resolveSplitSteal(client, { gameId });
        if (record.mode === MODES.DOUBLE_KEEP) resolveDoubleKeep(client, { gameId });
      }
    }
  }, 15 * 1000);
}

module.exports = {
  MODES,
  MODE_LABELS,
  startEndGame,
  handleGameButton,
  startGameScheduler,
};
