require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const storage = require('./utils/storage');
const giveawayCmd = require('./commands/giveaway');
const ticketCmd = require('./commands/ticket');
const games = require('./utils/games');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  c.user.setPresence({ activities: [{ name: 'Fyre Orders' }], status: 'online' });
  giveawayCmd.startGiveawayScheduler(c);
  games.startGameScheduler(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return command.execute(interaction);
    }

    // Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === giveawayCmd.GIVEAWAY_ENTER_ID) {
        const giveaways = storage.load('giveaways', {});
        const record = giveaways[interaction.message.id];
        if (!record || record.ended) {
          return interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
        }
        record.entrants = record.entrants || [];
        if (record.entrants.includes(interaction.user.id)) {
          record.entrants = record.entrants.filter((id) => id !== interaction.user.id);
          giveaways[interaction.message.id] = record;
          storage.save('giveaways', giveaways);
          return interaction.reply({ content: 'You left the giveaway. Click again to re-enter.', ephemeral: true });
        }
        record.entrants.push(interaction.user.id);
        giveaways[interaction.message.id] = record;
        storage.save('giveaways', giveaways);
        return interaction.reply({ content: `You're entered into the giveaway for **${record.prize}**! 🎉`, ephemeral: true });
      }

      if (customId === ticketCmd.OPEN_TICKET_ID) return ticketCmd.openTicket(interaction);
      if (customId === ticketCmd.CLOSE_TICKET_ID) return ticketCmd.requestClose(interaction);
      if (customId === ticketCmd.CONFIRM_CLOSE_ID) return ticketCmd.confirmClose(interaction);
      if (customId === ticketCmd.CANCEL_CLOSE_ID) return ticketCmd.cancelClose(interaction);

      if (customId.startsWith('ss_') || customId.startsWith('dk_')) {
        const handled = await games.handleGameButton(interaction);
        if (handled) return;
      }
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
    if (interaction.isRepliable()) {
      const payload = { content: 'Something went wrong handling that.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is missing. Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
