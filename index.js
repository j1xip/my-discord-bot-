const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// متغيرات لحفظ الـ IDs والصورة
let targetChannelId = null; // لروم القفل والفتح
let autoImageChannelId = null; // لروم الصورة التلقائية
let autoImageUrl = null; // رابط الصورة المحددة

// قائمة اقتراحات الأسماء
const nameSuggestions = [
  "Shadow", "Nova", "Apex", "Phoenix", "Blaze", 
  "Vortex", "Specter", "Echo", "Lunar", "Orion",
  "Aura", "Zenith", "Titan", "Eclipse", "Viper"
];

client.once('ready', () => {
  console.log(`تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // ************ أمر ping ************
  if (content === 'ping' || content === '-ping') {
    const ping = client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setDescription(`🏓 **Pong!**\n\n\`${ping}ms\`\n░░░░░░░░░░`);

    return message.reply({ embeds: [embed] });
  }

  // ************ 1. أمر اقتراح اسم ************
  if (content === 'عطني اقتراح اسم') {
    const randomName = nameSuggestions[Math.floor(Math.random() * nameSuggestions.length)];
    return message.reply(`💡 اقتراح الاسم لك: **${randomName}**`);
  }

  // ************ 2. أمر تحديد روم القفل والفتح ************
  if (content.startsWith('-تحديد قفل وفتح روم')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد قفل وفتح روم #الروم`');
    }

    targetChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${targetChannelId}> للتحكم بالقفل والفتح! تقدرين تغيرينها بأي وقت.`);
  }

  // ************ 3. أمر قفل الروم المحدد ************
  if (content === '-قفل') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدمي أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${targetChannelId}>`);
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });
      message.channel.send('🔒 تم قفل هذه الروم بنجاح.');
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء القفل، تأكدي من صلاحيات البوت.');
    }
  }

  // ************ 4. أمر فتح الروم المحدد ************
  if (content === '-فتح') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدمي أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${targetChannelId}>`);
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: true
      });
      message.channel.send('🔓 تم فتح هذه الروم بنجاح.');
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء الفتح، تأكدي من صلاحيات البوت.');
    }
  }

  // ************ 5. أمر تحديد روم الصورة تلقائياً ************
  if (content.startsWith('-تحديد روم صوره')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد روم صوره #الروم`');
    }

    autoImageChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${autoImageChannelId}> لإرسال الصورة تلقائياً! لا تنسي تحديد الصورة بأمر \`-تحديد صوره\`.`);
  }

  // ************ 6. أمر تحديد الصورة ************
  if (content === '-تحديد صوره') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply('❌ يرجى إرفاق صورة مع هذا الأمر من ألبوم الكاميرا.');
    }

    const contentType = attachment.contentType;
    if (!contentType || (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png') && !contentType.startsWith('image/gif'))) {
      return message.reply('❌ الصيغة غير مدعومة! يرجى رفع صورة بصيغة GIF أو PNG أو JPG.');
    }

    autoImageUrl = attachment.url;
    return message.reply('✅ تم تحديد الصورة بنجاح وسيتم إرسالها تلقائياً بعد كل رسالة في الروم المحدد.');
  }

  // ************ 7. ميزة إرسال الصورة تلقائياً ************
  if (autoImageChannelId && autoImageUrl && message.channel.id === autoImageChannelId) {
    if (message.author.id === client.user.id) return;

    try {
      await message.channel.send({ files: [autoImageUrl] });
    } catch (error) {
      console.error('Error sending auto image:', error);
    }
  }

});

client.login(process.env.DISCORD_TOKEN);
