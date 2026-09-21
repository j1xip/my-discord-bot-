const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // مطلوب للتحقق من رولات الأعضاء
  ]
});

// 🛑 الآي دي الخاص بك (حسابك الشخصي)
const OWNER_ID = '1423724725519126619';

// تخزين الإعدادات لكل سيرفر (الرولات المسموحة، الرومات المحددة، إلخ)
const serverSettings = new Map();

client.once('ready', () => {
  console.log(`تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

// ************ نظام طلب دخول السيرفرات والإشعارات ************
client.on('guildCreate', async (guild) => {
  try {
    const owner = await client.users.fetch(OWNER_ID).catch(() => null);
    if (!owner) return;

    let inviter = 'غير معروف';
    try {
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: 28, // Bot Add log type
      });
      const botAddLog = fetchedLogs.entries.first();
      if (botAddLog) {
        inviter = `<@${botAddLog.executor.id}> (${botAddLog.executor.tag})`;
      }
    } catch (e) {
      inviter = 'غير معروف (تأكد من صلاحيات Audit Log)';
    }

    const guildIcon = guild.iconURL({ dynamic: true, size: 1024 }) || 'https://i.imgur.com/AfFp7pu.png';

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📥 طلب إضافة بوت جديد')
      .setDescription(`تمت إضافة البوت إلى سيرفر جديد!`)
      .setThumbnail(guildIcon)
      .addFields(
        { name: '🌐 اسم السيرفر', value: `\`${guild.name}\``, inline: true },
        { name: '🆔 آي دي السيرفر', value: `\`${guild.id}\``, inline: true },
        { name: '👥 عدد الأعضاء', value: `\`${guild.memberCount}\``, inline: true },
        { name: '👤 الشخص اللي يبي البوت يدخل', value: inviter, inline: false }
      )
      .setFooter({ text: 'يرجى اختيار قبول أو رفض' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${guild.id}`)
        .setLabel('قبول')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`deny_${guild.id}`)
        .setLabel('رفض')
        .setStyle(ButtonStyle.Danger)
    );

    await owner.send({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error handling guildCreate:', error);
  }
});

// ************ التفاعل مع أزرار القبول والرفض بالخاص ************
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: '❌ هذا الزر ليس مخصصاً لك!', ephemeral: true });
  }

  const [action, guildId] = interaction.customId.split('_');
  const guild = client.guilds.cache.get(guildId);

  if (action === 'deny') {
    if (guild) {
      await guild.leave();
      await interaction.update({ content: `❌ تم رفض السيرفر **${guild.name}** والخروج منه بنجاح.`, embeds: [], components: [] });
    } else {
      await interaction.update({ content: `❌ تم الرفض، ولكن البوت غير موجود في السيرفر حالياً.`, embeds: [], components: [] });
    }
  } else if (action === 'accept') {
    await interaction.update({ content: `✅ تم قبول السيرفر **${guild ? guild.name : guildId}** وبقاء البوت فيه بنجاح!`, embeds: [], components: [] });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // للتأكد أن الرسالة داخل سيرفر

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

  const content = message.content.trim();

  // ************ أمر تحديد رولات البوت (للأونر أو المشرفين) ************
  if (content.startsWith('-تحديد رولات البوت')) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ هذا الأمر مخصص لمشرفي/أونر السيرفر فقط لتحديد الرولات المسموحة للبوت.');
    }

    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size === 0) {
      return message.reply('❌ يرجى منشن رول واحد على الأقل، مثال: `-تحديد رولات البوت @رول`');
    }

    settings.allowedRoleIds = mentionedRoles.map(r => r.id);
    const rolesList = mentionedRoles.map(r => `<@&${r.id}>`).join(', ');
    return message.reply(`✅ تم تحديث الرولات التي يسمح للبوت الاستماع لها في هذا السيرفر: ${rolesList}`);
  }

  // ************ عرض رولات البوت الحالية ************
  if (content === '-رولات البوت') {
    if (settings.allowedRoleIds.length === 0) {
      return message.reply('⚠️ لم يتم تحديد أي رولات بعد لهذا السيرفر. استخدم `-تحديد رولات البوت @رول`.');
    }
    const rolesList = settings.allowedRoleIds.map(id => `<@&${id}>`).join(', ');
    return message.reply(`📌 **رولات البوت المعتمدة حالياً:** ${rolesList}`);
  }

  // ************ حذف وإعادة ضبط رولات البوت ************
  if (content === '-حذف رولات البوت') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ هذا الأمر مخصص لمشرفي/أونر السيرفر فقط.');
    }
    settings.allowedRoleIds = [];
    return message.reply('🗑️ تم حذف وإعادة ضبط رولات البوت في هذا السيرفر بنجاح.');
  }

  // التحقق مما إذا كان السيرفر قد حدد رولات مسموحة أم لا (إذا تم تحديدها، يجب أن يمتلك العضو إحداها)
  if (settings.allowedRoleIds.length > 0) {
    const hasAllowedRole = settings.allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
    if (!hasAllowedRole) return;
  }

  // ************ 1. أمر قائمة الأوامر (-ك) ************
  if (content === '-ك' || content === '-commands') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 قائمة أوامر البوت المتاحة لك')
      .setDescription('هذه هي جميع الأوامر المبرمجة في بوتك الخاص:')
      .addFields(
        { name: '🏓 `ping` أو `-ping`', value: 'لعرض سرعة استجابة البوت (Latency).' },
        { name: '📌 `-تحديد رولات البوت @رول`', value: 'لتحديد الرولات المسموح لها استخدام الأوامر (للأدمن).' },
        { name: '📌 `-رولات البوت`', value: 'لعرض الرولات المعتمدة في السيرفر.' },
        { name: '🗑️ `-حذف رولات البوت`', value: 'لحذف وإعادة ضبط رولات البوت المعتمدة.' },
        { name: '📌 `-تحديد قفل وفتح روم #الروم`', value: 'لتحديد الروم المخصص لأوامر القفل والفتح.' },
        { name: '🔒 `-قفل`', value: 'يقفل الروم المحددة تلقائياً بحيث لا يمكن لأحد الكتابة فيها.' },
        { name: '🔓 `-فتح`', value: 'يفتح الروم المحددة مرة أخرى.' },
        { name: '🖼️ `-تحديد روم صوره #الروم`', value: 'لتحديد روم معين لإرسال الصورة التلقائية فيه.' },
        { name: '📸 `-تحديد صوره`', value: 'لرفع وتحديد الصورة التي ستُرسل تلقائياً (أرفقها مع الأمر).' },
        { name: '🗑️ `-ريموف صوره`', value: 'لإيقاف وإلغاء تحديد روم الصور التلقائية.' },
        { name: '📋 `-قائمه صور`', value: 'لعرض الروم المفعل حالياً لإرسال الصور.' },
        { name: '📋 `-ك` أو `-commands`', value: 'يعرض لك هذه قائمة الأوامر وفوائدها.' }
      )
      .setFooter({ text: 'البوت مخصص لحاملي الرول المعتمد فقط.' });

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

  // ************ 3. أمر تحديد روم القفل والفتح ************
  if (content.startsWith('-تحديد قفل وفتح روم')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد قفل وفتح روم #الروم`');
    }

    settings.targetChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${settings.targetChannelId}> للتحكم بالقفل والفتح!`);
  }

  // ************ 4. أمر قفل الروم المحدد ************
  if (content === '-قفل') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!settings.targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدم أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== settings.targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${settings.targetChannelId}>`);
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

  // ************ 5. أمر فتح الروم المحدد ************
  if (content === '-فتح') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية التحكم بالرومات.');
    }

    if (!settings.targetChannelId) {
      return message.reply('⚠️ لم يتم تحديد روم بعد! استخدم أمر `-تحديد قفل وفتح روم #الروم` أولاً.');
    }

    if (message.channel.id !== settings.targetChannelId) {
      return message.reply(`⚠️ هذا الأمر يعمل فقط في الروم المحددة: <#${settings.targetChannelId}>`);
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

  // ************ 6. أمر تحديد روم الصورة تلقائياً ************
  if (content.startsWith('-تحديد روم صوره')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    const mentionedChannel = message.mentions.channels.first();
    if (!mentionedChannel) {
      return message.reply('❌ يرجى منشن الروم المطلوب، مثال: `-تحديد روم صوره #الروم`');
    }

    settings.autoImageChannelId = mentionedChannel.id;
    return message.reply(`✅ تم تحديد الروم <#${settings.autoImageChannelId}> لإرسال الصورة تلقائياً! لا تنس تحديد الصورة بأمر \`-تحديد صوره\`.`);
  }

  // ************ 7. أمر تحديد الصورة ************
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

    settings.autoImageUrl = attachment.url;
    return message.reply('✅ تم تحديد الصورة بنجاح وسيتم إرسالها تلقائياً بعد كل رسالة في الروم المحدد.');
  }

  // ************ 8. أمر إلغاء روم الصور (-ريموف صوره) ************
  if (content === '-ريموف صوره') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ما عندك صلاحية إدارة الرومات.');
    }

    settings.autoImageChannelId = null;
    settings.autoImageUrl = null;
    return message.reply('🗑️ تم إلغاء تفعيل وإزالة روم الصور التلقائية بنجاح.');
  }

  // ************ 9. أمر عرض قائمة صور (-قائمه صور) ************
  if (content === '-قائمه صور') {
    const channelName = settings.autoImageChannelId ? `<#${settings.autoImageChannelId}>` : 'غير محدد';
    const hasImage = settings.autoImageUrl ? '✅ موجودة' : '❌ غير محددة';
    return message.reply(`📌 **روم الصور التلقائية الحالي:** ${channelName}\n🖼️ **حالة الصورة:** ${hasImage}`);
  }

  // ************ 10. ميزة إرسال الصورة تلقائياً ************
  if (settings.autoImageChannelId && settings.autoImageUrl && message.channel.id === settings.autoImageChannelId) {
    try {
      await message.channel.send({ files: [settings.autoImageUrl] });
    } catch (error) {
      console.error('Error sending auto image:', error);
    }
  }

});

client.login('MTU1MTI4MDk0MjY3NTY1Njg0NA.Gh-DAP.hNP7NE-SOErhIlJdbh7BLlMQy-uqpfy-ABONAI');

