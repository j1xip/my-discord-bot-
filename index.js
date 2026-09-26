const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const exitCommand = require('./exit.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// =====================================================
// اللون الكحلي للـ Embeds
// =====================================================

const EMBED_COLOR = '#0B1F3A';

// =====================================================
// مالكة البوت
// =====================================================

const BOT_OWNER_ID = '1423724725519126619';

function isBotOwner(userId) {
  return userId === BOT_OWNER_ID;
}

// =====================================================
// التخزين
// =====================================================

// إعدادات السيرفر
const serverSettings = new Map();

// النقاط الدائمة
const serverPoints = new Map();

// نقاط الراوند الحالي
const roundPoints = new Map();

const activeRounds = new Map();
const finishDrafts = new Map();

// =====================================================
// إعدادات السيرفر
// =====================================================

function getSettings(guildId) {
  if (!serverSettings.has(guildId)) {
    serverSettings.set(guildId, {
      allowedRoleIds: [],
      targetChannelId: null,
      autoImageChannelId: null,
      autoImageUrl: null
    });
  }

  return serverSettings.get(guildId);
}

// =====================================================
// النقاط الدائمة
// =====================================================

function getPoints(guildId) {
  if (!serverPoints.has(guildId)) {
    serverPoints.set(guildId, new Map());
  }

  return serverPoints.get(guildId);
}

// =====================================================
// نقاط الراوند
// =====================================================

function getRoundPoints(guildId) {
  if (!roundPoints.has(guildId)) {
    roundPoints.set(guildId, new Map());
  }

  return roundPoints.get(guildId);
}

// =====================================================
// بدء راوند جديد
// =====================================================

function startNewRound(guildId) {
  roundPoints.set(guildId, new Map());
  activeRounds.set(guildId, true);
}

// =====================================================
// التحقق من الرول
// =====================================================

function hasAllowedRole(member, settings) {
  if (!member) return false;

  // مالكة البوت تتجاوز جميع قيود الرولات والصلاحيات
  if (isBotOwner(member.id)) {
    return true;
  }

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  if (settings.allowedRoleIds.length === 0) {
    return true;
  }

  return settings.allowedRoleIds.some(roleId =>
    member.roles.cache.has(roleId)
  );
}

// =====================================================
// ترتيب النقاط الدائمة
// =====================================================

function getSortedPoints(guildId) {
  const points = getPoints(guildId);

  return Array.from(points.entries())
    .sort((a, b) => b[1] - a[1]);
}

// =====================================================
// ترتيب نقاط الراوند
// =====================================================

function getSortedRoundPoints(guildId) {
  const points = getRoundPoints(guildId);

  return Array.from(points.entries())
    .filter(([userId, points]) => points !== 0)
    .sort((a, b) => b[1] - a[1]);
}

// =====================================================
// نتائج الراوند
// =====================================================

function buildResultsText(guildId) {
  const sorted = getSortedRoundPoints(guildId);

  if (sorted.length === 0) {
    return '🏆 لا توجد نقاط مسجلة في هذا الراوند.';
  }

  let text = '🏆 نتائج الراوند\n\n';

  sorted.forEach(([userId, points], index) => {
    let rank;

    if (index === 0) {
      rank = '🥇';
    } else if (index === 1) {
      rank = '🥈';
    } else if (index === 2) {
      rank = '🥉';
    } else {
      rank = `#${index + 1}`;
    }

    text += `${rank} <@${userId}> — **${points} نقطة**\n`;
  });

  return text;
}

// =====================================================
// أوامر Slash
// =====================================================

const slashCommands = [

  new SlashCommandBuilder()
    .setName('رول')
    .setDescription('اختيار الرولات التي يستجيب لها البوت'),

  new SlashCommandBuilder()
    .setName('راوند')
    .setDescription('بدء راوند جديد وتصـفير نقاط الراوند'),

  new SlashCommandBuilder()
    .setName('نقاط')
    .setDescription('عرض النقاط الدائمة'),

  new SlashCommandBuilder()
    .setName('finish')
    .setDescription('إنهاء الراوند وتجهيز النتائج'),

  new SlashCommandBuilder()
    .setName('كوماند')
    .setDescription('عرض أوامر البوت'),

  // أمر خروج البوت
  exitCommand.data

].map(command => command.toJSON());

// =====================================================
// تشغيل البوت
// =====================================================

client.once('ready', async () => {
  console.log(`✅ تم تشغيل البوت: ${client.user.tag}`);

  try {
    const rest = new REST({
      version: '10'
    }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: slashCommands
      }
    );

    console.log('✅ تم تسجيل أوامر Slash.');
  } catch (error) {
    console.error('❌ خطأ في تسجيل Slash Commands:', error);
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on('interactionCreate', async interaction => {

  if (!interaction.guild) return;

  const guildId = interaction.guild.id;
  const settings = getSettings(guildId);

  // ===================================================
  // Slash Commands
  // ===================================================

  if (interaction.isChatInputCommand()) {

    // -----------------------------------------------
    // /خروج_نهائي
    // -----------------------------------------------

    if (interaction.commandName === 'خروج_نهائي') {
      return exitCommand.execute(interaction);
    }

    // -----------------------------------------------
    // /كوماند
    // -----------------------------------------------

    if (interaction.commandName === 'كوماند') {

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('📜 قائمة أوامر البوت')
        .addFields(

          {
            name: '🎮 النقاط والراوند',
            value:
              '`/راوند` — بدء راوند جديد وتصـفير نقاط الراوند\n' +
              '`+نقطه` — إضافة نقطة بالرد على رسالة\n' +
              '`-نقطه` — خصم نقطة بالرد على رسالة\n' +
              '`/finish` — إنهاء الراوند وعرض نتائجه\n' +
              '`/نقاط` — عرض النقاط الدائمة\n' +
              '`-نقاط` — عرض النقاط الدائمة'
          },

          {
            name: '👑 الرولات',
            value:
              '`/رول` — اختيار الرولات المسموح لها'
          },

          {
            name: '🏓 البوت',
            value:
              '`ping` أو `-ping` — سرعة البوت'
          },

          {
            name: '🔒 القفل والفتح',
            value:
              '`-تحديد قفل وفتح روم #الروم`\n' +
              '`-قفل`\n' +
              '`-فتح`'
          },

          {
            name: '🖼️ الصور',
            value:
              '`-تحديد روم صوره #الروم`\n' +
              '`-تحديد صوره` + صورة\n' +
              '`-ريموف صوره`\n' +
              '`-قائمه صور`'
          }

        )
        .setFooter({
          text: 'جميع إعدادات البوت خاصة بهذا السيرفر.'
        });

      return interaction.reply({
        embeds: [embed]
      });
    }

    // -----------------------------------------------
    // /رول
    // -----------------------------------------------

    if (interaction.commandName === 'رول') {

      if (
        !isBotOwner(interaction.user.id) &&
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content: '❌ هذا الأمر للأدمن فقط.',
          ephemeral: true
        });
      }

      const roles = interaction.guild.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .filter(role => !role.managed)
        .sort((a, b) => b.position - a.position);

      if (roles.size === 0) {
        return interaction.reply({
          content: '❌ ما فيه رولات متاحة.',
          ephemeral: true
        });
      }

      const roleOptions = Array.from(roles.values())
        .slice(0, 25)
        .map(role => ({
          label: role.name.slice(0, 100),
          value: role.id,
          description: settings.allowedRoleIds.includes(role.id)
            ? '✅ محدد حاليًا'
            : 'اختيار هذا الرول'
        }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`choose_roles_${guildId}`)
        .setPlaceholder('اختاري الرولات')
        .setMinValues(0)
        .setMaxValues(roleOptions.length)
        .addOptions(roleOptions);

      const row = new ActionRowBuilder()
        .addComponents(menu);

      const current =
        settings.allowedRoleIds.length > 0
          ? settings.allowedRoleIds.map(id => `<@&${id}>`).join(', ')
          : 'لا توجد رولات محددة — البوت يستجيب للجميع';

      return interaction.reply({
        content:
          `🎭 **الرولات الحالية:**\n${current}\n\n` +
          'اختاري الرولات اللي تبين البوت يستجيب لأعضائها فقط:',
        components: [row],
        ephemeral: true
      });
    }

    // -----------------------------------------------
    // /راوند
    // -----------------------------------------------

    if (interaction.commandName === 'راوند') {

      if (!hasAllowedRole(interaction.member, settings)) {
        return interaction.reply({
          content: '❌ ما عندك رول مسموح له باستخدام البوت.',
          ephemeral: true
        });
      }

      if (activeRounds.get(guildId)) {
        return interaction.reply({
          content: '⚠️ فيه راوند شغال حاليًا.',
          ephemeral: true
        });
      }

      startNewRound(guildId);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('🎮 بدأ راوند جديد!')
        .setDescription(
          '🔥 بدأ احتساب النقاط من الصفر!\n\n' +
          '➕ **إضافة نقطة:**\n' +
          'ردي على رسالة الشخص واكتبي `+نقطه`\n\n' +
          '➖ **خصم نقطة:**\n' +
          'ردي على رسالة الشخص واكتبي `-نقطه`\n\n' +
          '🏁 عند الانتهاء استخدمي `/finish`'
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // -----------------------------------------------
    // /نقاط
    // -----------------------------------------------

    if (interaction.commandName === 'نقاط') {

      const points = getPoints(guildId);

      if (points.size === 0) {
        return interaction.reply({
          content: '🏆 لا توجد نقاط مسجلة حتى الآن.'
        });
      }

      const sorted = getSortedPoints(guildId).slice(0, 10);

      let description = '';

      sorted.forEach(([userId, value], index) => {

        let rank;

        if (index === 0) rank = '🥇';
        else if (index === 1) rank = '🥈';
        else if (index === 2) rank = '🥉';
        else rank = `#${index + 1}`;

        description +=
          `${rank} <@${userId}> — **${value} نقطة**\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('🏆 النقاط الدائمة')
        .setDescription(description)
        .setFooter({
          text: 'النقاط الدائمة لا تتصفر مع الراوندات'
        });

      return interaction.reply({
        embeds: [embed]
      });
    }

    // -----------------------------------------------
    // /finish
    // -----------------------------------------------

    if (interaction.commandName === 'finish') {

      if (!hasAllowedRole(interaction.member, settings)) {
        return interaction.reply({
          content: '❌ ما عندك رول مسموح له باستخدام البوت.',
          ephemeral: true
        });
      }

      if (!activeRounds.get(guildId)) {
        return interaction.reply({
          content: '⚠️ ما فيه راوند شغال حاليًا.',
          ephemeral: true
        });
      }

      const results = buildResultsText(guildId);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('🏆 نتائج الراوند')
        .setDescription(results)
        .setFooter({
          text: 'تقدرين تعدلين الرسالة قبل إرسالها.'
        });

      const buttons = new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId(`edit_finish_${guildId}_${interaction.user.id}`)
            .setLabel('تعديل الرسالة')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId(`send_finish_${guildId}_${interaction.user.id}`)
            .setLabel('إرسال')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`cancel_finish_${guildId}_${interaction.user.id}`)
            .setLabel('إلغاء')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)

        );

      return interaction.reply({
        embeds: [embed],
        components: [buttons]
      });
    }
  }

  // ===================================================
  // اختيار الرولات
  // ===================================================

  if (interaction.isStringSelectMenu()) {

    if (!interaction.customId.startsWith('choose_roles_')) {
      return;
    }

    if (
      !isBotOwner(interaction.user.id) &&
      !interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return interaction.reply({
        content: '❌ هذا الخيار للأدمن فقط.',
        ephemeral: true
      });
    }

    settings.allowedRoleIds = interaction.values;

    if (interaction.values.length === 0) {

      return interaction.update({
        content:
          '🗑️ تم إلغاء تحديد الرولات.\n\n' +
          'البوت الآن يستجيب للجميع.',
        components: []
      });
    }

    const rolesText = interaction.values
      .map(id => `<@&${id}>`)
      .join('\n');

    return interaction.update({
      content:
        '✅ **تم تحديد الرولات بنجاح!**\n\n' +
        rolesText +
        '\n\nالبوت الآن يستجيب لأعضاء هذه الرولات فقط.',
      components: []
    });
  }

  // ===================================================
  // أزرار النتائج
  // ===================================================

  if (interaction.isButton()) {

    // -----------------------------------------------
    // تعديل النتائج
    // -----------------------------------------------

    if (interaction.customId.startsWith('edit_finish_')) {

      const parts = interaction.customId.split('_');
      const userId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذه النتيجة مو لك.',
          ephemeral: true
        });
      }

      const results = buildResultsText(guildId);

      const modal = new ModalBuilder()
        .setCustomId(
          `finish_modal_${guildId}_${interaction.user.id}`
        )
        .setTitle('✏️ تعديل نتائج الراوند');

      const textInput = new TextInputBuilder()
        .setCustomId('finish_text')
        .setLabel('عدلي رسالة النتائج')
        .setPlaceholder('تقدرين تحطين إيموجيات السيرفر هنا <:emoji:ID>')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000)
        .setValue(results.slice(0, 4000));

      const row = new ActionRowBuilder()
        .addComponents(textInput);

      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // -----------------------------------------------
    // إرسال النتائج الأصلية
    // -----------------------------------------------

    if (interaction.customId.startsWith('send_finish_')) {

      const parts = interaction.customId.split('_');
      const userId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذه النتيجة مو لك.',
          ephemeral: true
        });
      }

      const results = buildResultsText(guildId);

      await interaction.channel.send({
        content: results
      });

      activeRounds.set(guildId, false);

      return interaction.update({
        content: '✅ تم إرسال النتائج.',
        embeds: [],
        components: []
      });
    }

    // -----------------------------------------------
    // إلغاء
    // -----------------------------------------------

    if (interaction.customId.startsWith('cancel_finish_')) {

      const parts = interaction.customId.split('_');
      const userId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذا الزر مو لك.',
          ephemeral: true
        });
      }

      activeRounds.set(guildId, false);

      return interaction.update({
        content: '❌ تم إنهاء الراوند بدون إرسال النتائج.',
        embeds: [],
        components: []
      });
    }

    // -----------------------------------------------
    // إرسال النص المعدل
    // -----------------------------------------------

    if (interaction.customId.startsWith('send_custom_finish_')) {

      const parts = interaction.customId.split('_');
      const userId = parts[3];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ هذه المسودة مو لك.',
          ephemeral: true
        });
      }

      const key = `${guildId}_${interaction.user.id}`;

      if (!finishDrafts.has(key)) {
        return interaction.reply({
          content:
            '❌ انتهت المسودة، استخدمي `/finish` مرة ثانية.',
          ephemeral: true
        });
      }

      const text = finishDrafts.get(key);

      await interaction.channel.send({
        content: text
      });

      finishDrafts.delete(key);
      activeRounds.set(guildId, false);

      return interaction.update({
        content: '✅ تم نشر النتائج من البوت.',
        embeds: [],
        components: []
      });
    }
  }

  // ===================================================
  // Modal تعديل النتائج
  // ===================================================

  if (interaction.isModalSubmit()) {

    if (!interaction.customId.startsWith('finish_modal_')) {
      return;
    }

    const editedText =
      interaction.fields.getTextInputValue('finish_text');

    if (!editedText.trim()) {
      return interaction.reply({
        content: '❌ الرسالة فاضية.',
        ephemeral: true
      });
    }

    const key = `${guildId}_${interaction.user.id}`;

    finishDrafts.set(key, editedText);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🏆 معاينة الرسالة المعدلة')
      .setDescription(editedText)
      .setFooter({
        text: 'إذا كل شيء تمام اضغطي إرسال.'
      });

    const buttons = new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            `send_custom_finish_${guildId}_${interaction.user.id}`
          )
          .setLabel('إرسال')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(
            `cancel_finish_${guildId}_${interaction.user.id}`
          )
          .setLabel('إلغاء')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)

      );

    return interaction.reply({
      embeds: [embed],
      components: [buttons]
    });
  }

});

// =====================================================
// الرسائل العادية
// =====================================================

client.on('messageCreate', async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const guildId = message.guild.id;
  const settings = getSettings(guildId);

  // النقاط الدائمة
  const points = getPoints(guildId);

  // نقاط الراوند
  const currentRoundPoints = getRoundPoints(guildId);

  const content = message.content.trim();

  // ===================================================
  // -نقاط
  // ===================================================

  if (content === '-نقاط') {

    if (points.size === 0) {
      return message.reply(
        '🏆 لا توجد نقاط مسجلة حتى الآن.'
      );
    }

    const sorted =
      getSortedPoints(guildId).slice(0, 10);

    let description = '';

    sorted.forEach(([userId, value], index) => {

      let rank;

      if (index === 0) rank = '🥇';
      else if (index === 1) rank = '🥈';
      else if (index === 2) rank = '🥉';
      else rank = `#${index + 1}`;

      description +=
        `${rank} <@${userId}> — **${value} نقطة**\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🏆 النقاط الدائمة')
      .setDescription(description)
      .setFooter({
        text: 'النقاط الدائمة لا تتصفر مع الراوندات'
      });

    return message.reply({
      embeds: [embed]
    });
  }

  // ===================================================
  // +نقطه
  // ===================================================

  if (content === '+نقطه') {

    if (!hasAllowedRole(message.member, settings)) {
      return;
    }

    if (!activeRounds.get(guildId)) {
      return message.reply(
        '⚠️ ما فيه راوند شغال، استخدمي `/راوند` أول.'
      );
    }

    if (!message.reference) {
      return message.reply(
        '❌ لازم تردين على رسالة الشخص.'
      );
    }

    let targetMessage;

    try {
      targetMessage =
        await message.channel.messages.fetch(
          message.reference.messageId
        );
    } catch {
      return message.reply(
        '❌ ما قدرت أوصل للرسالة.'
      );
    }

    const targetUser = targetMessage.author;

    if (targetUser.bot) {
      return message.reply(
        '❌ ما تقدرين تعطين نقطة لبوت.'
      );
    }

    // إضافة للنقاط الدائمة
    const currentTotal =
      points.get(targetUser.id) || 0;

    points.set(
      targetUser.id,
      currentTotal + 1
    );

    // إضافة لنقاط الراوند
    const currentRound =
      currentRoundPoints.get(targetUser.id) || 0;

    currentRoundPoints.set(
      targetUser.id,
      currentRound + 1
    );

    return message.react('✅');
  }

  // ===================================================
  // -نقطه
  // ===================================================

  if (content === '-نقطه') {

    if (!hasAllowedRole(message.member, settings)) {
      return;
    }

    if (!activeRounds.get(guildId)) {
      return message.reply(
        '⚠️ ما فيه راوند شغال، استخدمي `/راوند` أول.'
      );
    }

    if (!message.reference) {
      return message.reply(
        '❌ لازم تردين على رسالة الشخص.'
      );
    }

    let targetMessage;

    try {
      targetMessage =
        await message.channel.messages.fetch(
          message.reference.messageId
        );
    } catch {
      return message.reply(
        '❌ ما قدرت أوصل للرسالة.'
      );
    }

    const targetUser = targetMessage.author;

    if (targetUser.bot) {
      return message.reply(
        '❌ ما تقدرين تخصمين من بوت.'
      );
    }

    // خصم من النقاط الدائمة
    const currentTotal =
      points.get(targetUser.id) || 0;

    points.set(
      targetUser.id,
      currentTotal - 1
    );

    // خصم من نقاط الراوند
    const currentRound =
      currentRoundPoints.get(targetUser.id) || 0;

    currentRoundPoints.set(
      targetUser.id,
      currentRound - 1
    );

    return message.react('✅');
  }

  // ===================================================
  // التحقق من الرول
  // ===================================================

  if (!hasAllowedRole(message.member, settings)) {
    return;
  }

  // ===================================================
  // -ك / -commands
  // ===================================================

  if (
    content === '-ك' ||
    content === '-commands'
  ) {

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('📜 أوامر البوت')
      .setDescription(
        '**النقاط والراوند:**\n' +
        '`/راوند` — راوند جديد وتصـفير نقاط الراوند\n' +
        '`+نقطه` بالرد\n' +
        '`-نقطه` بالرد\n' +
        '`/finish`\n' +
        '`/نقاط` — النقاط الدائمة\n' +
        '`-نقاط` — النقاط الدائمة\n\n' +

        '**الرولات:**\n' +
        '`/رول`\n\n' +

        '**البوت:**\n' +
        '`ping`\n' +
        '`-ping`\n\n' +

        '**القفل:**\n' +
        '`-تحديد قفل وفتح روم #الروم`\n' +
        '`-قفل`\n' +
        '`-فتح`\n\n' +

        '**الصور:**\n' +
        '`-تحديد روم صوره #الروم`\n' +
        '`-تحديد صوره` + صورة\n' +
        '`-ريموف صوره`\n' +
        '`-قائمه صور`'
      );

    return message.reply({
      embeds: [embed]
    });
  }

  // ===================================================
  // Ping
  // ===================================================

  if (
    content === 'ping' ||
    content === '-ping'
  ) {

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🏓 Pong!')
      .setDescription(
        `سرعة البوت: **${client.ws.ping}ms**`
      );

    return message.reply({
      embeds: [embed]
    });
  }

  // ===================================================
  // تحديد روم القفل والفتح
  // ===================================================

  if (
    content.startsWith('-تحديد قفل وفتح روم')
  ) {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.ManageChannels
      )
    ) {
      return message.reply(
        '❌ ما عندك صلاحية إدارة الرومات.'
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        '❌ حددي الروم، مثال:\n`-تحديد قفل وفتح روم #الروم`'
      );
    }

    settings.targetChannelId = channel.id;

    return message.reply(
      `✅ تم تحديد ${channel} كروم القفل والفتح.`
    );
  }

  // ===================================================
  // قفل
  // ===================================================

  if (content === '-قفل') {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.ManageChannels
      )
    ) {
      return;
    }

    if (!settings.targetChannelId) {
      return message.reply(
        '❌ ما تحدد روم القفل والفتح.'
      );
    }

    const channel =
      message.guild.channels.cache.get(
        settings.targetChannelId
      );

    if (!channel) {
      return message.reply(
        '❌ الروم المحدد غير موجود.'
      );
    }

    try {

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: false
        }
      );

      return message.reply(
        `🔒 تم قفل ${channel}.`
      );

    } catch {
      return message.reply(
        '❌ ما قدرت أقفل الروم. تأكدي من صلاحيات البوت.'
      );
    }
  }

  // ===================================================
  // فتح
  // ===================================================

  if (content === '-فتح') {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.ManageChannels
      )
    ) {
      return;
    }

    if (!settings.targetChannelId) {
      return message.reply(
        '❌ ما تحدد روم القفل والفتح.'
      );
    }

    const channel =
      message.guild.channels.cache.get(
        settings.targetChannelId
      );

    if (!channel) {
      return message.reply(
        '❌ الروم المحدد غير موجود.'
      );
    }

    try {

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: true
        }
      );

      return message.reply(
        `🔓 تم فتح ${channel}.`
      );

    } catch {
      return message.reply(
        '❌ ما قدرت أفتح الروم.'
      );
    }
  }

  // ===================================================
  // تحديد روم الصور
  // ===================================================

  if (
    content.startsWith('-تحديد روم صوره')
  ) {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return message.reply(
        '❌ هذا الأمر للأدمن فقط.'
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        '❌ حددي الروم، مثال:\n`-تحديد روم صوره #الروم`'
      );
    }

    settings.autoImageChannelId = channel.id;

    return message.reply(
      `✅ تم تحديد ${channel} كروم الصور التلقائية.`
    );
  }

  // ===================================================
  // تحديد الصورة
  // ===================================================

  if (content === '-تحديد صوره') {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return message.reply(
        '❌ هذا الأمر للأدمن فقط.'
      );
    }

    if (!message.attachments.size) {
      return message.reply(
        '❌ أرفقي الصورة مع الأمر.'
      );
    }

    const attachment =
      message.attachments.first();

    const allowed =
      ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowed.includes(attachment.contentType)) {
      return message.reply(
        '❌ مسموح فقط JPG / PNG / GIF.'
      );
    }

    settings.autoImageUrl = attachment.url;

    return message.reply(
      '✅ تم تحديد الصورة بنجاح.'
    );
  }

  // ===================================================
  // إزالة الصورة
  // ===================================================

  if (content === '-ريموف صوره') {

    if (
      !isBotOwner(message.author.id) &&
      !message.member.permissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return message.reply(
        '❌ هذا الأمر للأدمن فقط.'
      );
    }

    settings.autoImageUrl = null;

    return message.reply(
      '🗑️ تم حذف الصورة المحددة.'
    );
  }

  // ===================================================
  // قائمة الصور
  // ===================================================

  if (content === '-قائمه صور') {

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🖼️ إعدادات الصور')
      .addFields(
        {
          name: 'الروم',
          value: settings.autoImageChannelId
            ? `<#${settings.autoImageChannelId}>`
            : 'غير محدد'
        },
        {
          name: 'الصورة',
          value: settings.autoImageUrl
            ? '✅ محددة'
            : '❌ غير محددة'
        }
      );

    return message.reply({
      embeds: [embed]
    });
  }

  // ===================================================
  // إرسال الصورة تلقائيًا
  // ===================================================

  if (
    settings.autoImageChannelId &&
    settings.autoImageUrl &&
    message.channel.id === settings.autoImageChannelId
  ) {

    try {

      await message.channel.send({
        files: [settings.autoImageUrl]
      });

    } catch (error) {
      console.error(
        'خطأ في إرسال الصورة:',
        error
      );
    }
  }

});

// =====================================================
// تسجيل الدخول
// =====================================================

client.login(process.env.DISCORD_TOKEN);
