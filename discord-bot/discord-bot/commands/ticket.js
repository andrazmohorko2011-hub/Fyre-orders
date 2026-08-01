const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const storage = require('../utils/storage');

const OPEN_TICKET_ID = 'ticket_open';
const CLOSE_TICKET_ID = 'ticket_close';
const CONFIRM_CLOSE_ID = 'ticket_confirm_close';
const CANCEL_CLOSE_ID = 'ticket_cancel_close';

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(OPEN_TICKET_ID).setLabel('📩 Open a Ticket').setStyle(ButtonStyle.Success)
  );
}

function buildCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_TICKET_ID).setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
  );
}

function buildConfirmRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CONFIRM_CLOSE_ID).setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(CANCEL_CLOSE_ID).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}

async function openTicket(interaction) {
  const tickets = storage.load('tickets', {});
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const existing = Object.values(tickets).find(
    (t) => t.guildId === guildId && t.userId === userId && t.open
  );
  if (existing) {
    return interaction.reply({ content: `You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });
  }

  const categoryId = process.env.TICKET_CATEGORY_ID || undefined;
  const supportRoleId = process.env.SUPPORT_ROLE_ID;

  const permissionOverwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];
  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites,
      reason: `Ticket opened by ${interaction.user.tag}`,
    });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    return interaction.reply({
      content: 'I could not create a ticket channel. Check that TICKET_CATEGORY_ID is valid and I have Manage Channels permission.',
      ephemeral: true,
    });
  }

  tickets[channel.id] = {
    channelId: channel.id,
    guildId,
    userId,
    open: true,
    createdAt: Date.now(),
  };
  storage.save('tickets', tickets);

  const embed = new EmbedBuilder()
    .setTitle('🎫 Support Ticket')
    .setDescription(
      `Hi <@${userId}>, thanks for reaching out! Describe your issue and a member of our support team will be with you shortly.` +
        (supportRoleId ? `\n\n<@&${supportRoleId}>` : '')
    )
    .setColor(0x57f287);

  await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [buildCloseRow()] });
  return interaction.reply({ content: `Your ticket has been created: ${channel}`, ephemeral: true });
}

async function requestClose(interaction) {
  const tickets = storage.load('tickets', {});
  const record = tickets[interaction.channel.id];
  if (!record || !record.open) {
    return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
  }
  return interaction.reply({
    content: 'Are you sure you want to close this ticket?',
    components: [buildConfirmRow()],
    ephemeral: true,
  });
}

async function confirmClose(interaction) {
  const tickets = storage.load('tickets', {});
  const record = tickets[interaction.channel.id];
  if (!record || !record.open) {
    return interaction.update({ content: 'This ticket is already closed.', components: [] });
  }

  record.open = false;
  record.closedAt = Date.now();
  record.closedBy = interaction.user.id;
  tickets[interaction.channel.id] = record;
  storage.save('tickets', tickets);

  await interaction.update({ content: 'Closing ticket in 5 seconds...', components: [] });
  setTimeout(async () => {
    try {
      await interaction.channel.delete(`Ticket closed by ${interaction.user.tag}`);
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 5000);
}

async function cancelClose(interaction) {
  return interaction.update({ content: 'Ticket close cancelled.', components: [] });
}

module.exports = {
  OPEN_TICKET_ID,
  CLOSE_TICKET_ID,
  CONFIRM_CLOSE_ID,
  CANCEL_CLOSE_ID,
  buildPanelRow,
  openTicket,
  requestClose,
  confirmClose,
  cancelClose,
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the support ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post the ticket panel with an Open Ticket button')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post the panel in'))
    )
    .addSubcommand((sub) => sub.setName('close').setDescription('Close the current ticket')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (sub === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('🎫 Need Help?')
        .setDescription('Click the button below to open a private support ticket with our team.')
        .setColor(0x5865f2);
      await channel.send({ embeds: [embed], components: [buildPanelRow()] });
      return interaction.reply({ content: `Ticket panel posted in ${channel}.`, ephemeral: true });
    }

    if (sub === 'close') {
      return requestClose(interaction);
    }
  },
};
