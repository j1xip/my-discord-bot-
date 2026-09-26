const {
  SlashCommandBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('خروج_نهائي')
    .setDescription('يخرج البوت نهائيًا من هذا السيرفر'),

  async execute(interaction) {

    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ هذا الأمر لازم تستخدمينه داخل سيرفر.',
        ephemeral: true
      });
    }

    await interaction.reply({
      content: '👋 تم، البوت بيطلع من السيرفر.',
      ephemeral: true
    });

    try {
      await interaction.guild.leave();
    } catch (error) {
      console.error('❌ تعذر خروج البوت من السيرفر:', error);
    }
  }
};
