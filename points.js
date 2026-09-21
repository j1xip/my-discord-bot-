const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// تخزين الإعدادات والنقاط لكل سيرفر
const serverSettings = new Map();
// تخزين النقاط التراكمية: Map<guildId, Map<userId, points>>
const serverPoints = new Map();
// تخزين حالة جولة الألعاب بكل سيرفر: Map<guildId, boolean>
const activeRounds = new Map();

client.once('ready', () => {
  console.log(`تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guildId = message.guild.id;
  
  if (!serverSettings.has(guildId)) {
    serverSettings.set(guildId, {
      allowedRoleIds: [],
      targetChannelId: null,
      autoImageChannelId: null,
      autoImageUrl: null
    });
  }
  const settings = serverSettings.get(guildId);

  if (!serverPoints.has(guildId)) {
    serverPoints.set(guildId, new Map());
  }
  const pointsMap = serverPoints.get(guildId);

  const content = message.content.trim();

  // ************ 1. أمر نقاط (متاح للجميع) ************
  if (content === '-نقاط') {
    if (pointsMap.size === 0) {
      return message.reply('🏆 لا توجد أي نقاط مسجلة حتى الآن في هذا السيرفر.');
    }

    // ترتيب النقاط تنازلياً وأخذ أعلى 10 مراكز
    const sortedPoints = Array.from(pointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let desc = '';
    sortedPoints.forEach(([userId, points], index) => {
      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';
      else medal = `\`#${index + 1}\``;

      desc += `${medal} <@${userId}> ── **${points}** نقطة\n`;
    });

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 لوحة توب 10 مراكز (النقاط التراكمية)')
      .setDescription(desc)
      .setFooter({ text: 'ال
