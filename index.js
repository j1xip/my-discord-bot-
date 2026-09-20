const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🛑 استبدل الرقم اللي بين علامتي التنصيص برقم الـ User ID الرقمي الخاص بك (اللي نسخته من بروفايلك)
const MY_USER_ID = '1423724725519126619';

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

  // هذا الشرط يخلي البوت يتجاهل أي شخص يرسل رسالة إلا إذا كنت أنت صاحب الآي دي
  if (message.author.id !== MY_USER_ID) return;

  const content = message.content.trim();

  // ************ 1. أمر قائمة الأوامر (-ك) ************
  if (content === '-ك' || content === '-commands') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 قائمة أوامر البوت المتاحة لك')
      .setDescription('هذه هي جميع الأوامر المبرمجة في بوتك الخاص:')
      .addFields(
        { name: '🏓 `ping` أو `-ping`', value: 'لعرض سرعة استجابة البوت (Latency).' },
        { name: '💡 `عطني اقتراح اسم`', value: 'يعطيك اسم عشوائي رهيب مقترح.' },
        { name: '📌 `-تحديد قفل وفتح روم #الروم`', value: 'لتحديد الروم المخصص لأوامر القفل والفتح.' },
        { name: '🔒 `-قفل`', value: 'يقفل الروم المحددة تلقائياً بحيث لا يمكن لأحد الكتابة فيها.' },
        { name: '🔓 `-فتح`', value: 'يفتح الروم المحددة مرة أخرى.' },
        { name: '🖼️ `-تحديد روم صوره #الروم`', value: 'لتحديد روم معين لإرسال الصورة التلقائية فيه.' },
        { name: '📸 `-تحديد صوره`', value: 'لرفع وتحديد الصورة التي ستُرسل تلقائياً (أرفقها مع الأمر).' },
        { name: '🗑️ `-ريموف صوره`', value: 'لإيقاف وإلغاء تحديد روم الصور التلقائية.' },
        { name: '📋 `-قائمه صور`', value: 'لعرض الروم المفعل حالياً لإرسال الصور.' },
        { name: '📋 `-ك` أو `-commands`', value: 'يعرض لك هذه القائمة التي توضح كل الأوامر وفوائدها.' }
      )
      .setFooter({ text: 'البوت يعمل حصرياً لصاحب الآي دي المخصص.' });

    return message.reply({ embeds: [embed] });
  }

  // ************ 2. أمر ping ************
  if (content === 'ping' || content === '-ping') {
    const ping = client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setDescription(`🏓 **Pong!**\n\n\`${ping}ms\`\n░░░░░░░░░░`);

    return message.reply({ embeds: [embed] });
  }

  // ************ 3. أمر اقتراح اسم ************
  if (content === 'عطني اقتراح اسم') {
    const randomName = nameSuggestions[Math.floor(Math.random() * nameSuggestions.length)];
    return message.reply(`💡 اقتراح الاسم لك: **${randomName}**`);
  }

  // ************ 4. أمر تحديد روم القفل والفتح ************
  if (content.startsWith('-تحديد قفل وفتح روم')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد قفل وفتح روم #الروم`');
    }

    targetChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${targetChannelId}> للتحكم بالقفل والفتح!`);
  }

  // ************ 5. أمر قفل الروم المحدد ************
  if (content === '-قفل') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدم أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${targetChannelId}>`);
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });
      return message.channel.send('🔒 تم قفل هذه الروم بنجاح.');
    } catch (error) {
      console.error(error);
      return message.reply('❌ حدث خطأ أثناء القفل، تأكد من صلاحيات البوت.');
    }
  }

  // ************ 6. أمر فتح الروم المحدد ************
  if (content === '-فتح') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدم أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${targetChannelId}>`);
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: true
      });
      return message.channel.send('🔓 تم فتح هذه الروم بنجاح.');
    } catch (error) {
      console.error(error);
      return message.reply('❌ حدث خطأ أثناء الفتح، تأكد من صلاحيات البوت.');
    }
  }

  // ************ 7. أمر تحديد روم الصورة تلقائياً ************
  if (content.startsWith('-تحديد روم صوره')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد روم صوره #الروم`');
    }

    autoImageChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${autoImageChannelId}> لإرسال الصورة تلقائياً! لا تنس تحديد الصورة بأمر \`-تحديد صوره\`.`);
  }

  // ************ 8. أمر تحديد الصورة ************
  if (content === '-تحديد صوره') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply('❌ يرجى إرفاق صورة مع هذا الأمر.');
    }

    const contentType = attachment.contentType;
    if (!contentType || (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png') && !contentType.startsWith('image/gif'))) {
      return message.reply('❌ الصيغة غير مدعومة! يرجى رفع صورة بصيغة GIF أو PNG أو JPG.');
    }

    autoImageUrl = attachment.url;
    return message.reply('✅ تم تحديد الصورة بنجاح وسيتم إرسالها تلقائياً بعد كل رسالة في الروم المحدد.');
  }

  // ************ 9. أمر إلغاء روم الصور (-ريموف صوره) ************
  if (content === '-ريموف صوره') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    autoImageChannelId = null;
    autoImageUrl = null;
    return message.reply('🗑️ تم إلغاء تفعيل وإزالة روم الصور التلقائية بنجاح.');
  }

  // ************ 10. أمر عرض قائمة صور (-قائمه صور) ************
  if (content === '-قائمه صور') {
    const channelName = autoImageChannelId ? `<#${autoImageChannelId}>` : 'غير محدد';
    const hasImage = autoImageUrl ? '✅ موجودة' : '❌ غير محددة';
    return message.reply(`📌 **روم الصور التلقائية الحالي:** ${channelName}\n🖼️ **حالة الصورة:** ${hasImage}`);
  }

  // ************ 11. ميزة إرسال الصورة تلقائياً ************
  if (autoImageChannelId && autoImageUrl && message.channel.id === autoImageChannelId) {
    try {
      await message.channel.send({ files: [autoImageUrl] });
    } catch (error) {
      console.error('Error sending auto image:', error);
    }
  }

});

client.login(process.env.DISCORD_TOKEN);
