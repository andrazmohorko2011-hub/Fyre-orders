const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

async function setChannelLock(interaction, { locking }) {
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const everyone = interaction.guild.roles.everyone;

  if (!channel.isTextBased() || channel.isThread()) {
    return interaction.reply({ content: 'I can only lock or unlock regular text channels.', ephemeral: true });
  }

  const me = interaction.guild.members.me;
  if (!channel.permissionsFor(me).has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: `I need the **Manage Roles/Permissions** permission on ${channel} to do that.`,
      ephemeral: true,
    });
  }

  const current = channel.permissionOverwrites.cache.get(everyone.id);
  const alreadyLocked = current?.deny.has(PermissionFlagsBits.SendMessages);

  if (locking && alreadyLocked) {
    return interaction.reply({ content: `${channel} is already locked.`, ephemeral: true });
  }
  if (!locking && !alreadyLocked) {
    return interaction.reply({ content: `${channel} is not locked.`, ephemeral: true });
  }

  await channel.permissionOverwrites.edit(
    everyone,
    // null clears the SendMessages overwrite back to default instead of forcing it to allow,
    // so it doesn't fight with other roles' permissions.
    { SendMessages: locking ? false : null },
    { reason: `${locking ? 'Locked' : 'Unlocked'} by ${interaction.user.tag}: ${reason}` }
  );

  const embed = new EmbedBuilder()
    .setDescription(
      locking
        ? `🔒 This channel has been locked.\n**Reason:** ${reason}`
        : `🔓 This channel has been unlocked.\n**Reason:** ${reason}`
    )
    .setColor(locking ? 0xed4245 : 0x57f287);

  if (channel.id === interaction.channel.id) {
    await interaction.reply({ embeds: [embed] });
  } else {
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `${locking ? '🔒 Locked' : '🔓 Unlocked'} ${channel}.`, ephemeral: true });
  }
}

module.exports = { setChannelLock };
