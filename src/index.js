
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  getGuildConfig,
  updateGuildConfig,
  updateTicketConfig
} = require("./lib/database");

const {
  createRolePanels,
  registerRoleTagHandler
} = require("./role-tags");

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN não encontrado. Configure seu arquivo .env.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

// Registra o sistema de botões de cargos.
registerRoleTagHandler(client);

const TICKET_SUBJECTS = {
  duvidas: { label: "Dúvidas", emoji: "❓" },
  denuncias: { label: "Denúncias", emoji: "🚨" },
  sugestoes: { label: "Sugestões", emoji: "💡" },
  parcerias: { label: "Parcerias", emoji: "🤝" },
  problemas: { label: "Problemas", emoji: "⚙️" },
  outros: { label: "Outros assuntos", emoji: "📩" }
};

// Logs do servidor.
async function sendLog(guild, description, color = 0x5865F2) {
  const config = getGuildConfig(guild.id);

  if (!config.log_channel_id) return;

  const channel = await guild.channels
    .fetch(config.log_channel_id)
    .catch(() => null);

  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(description)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(error => {
    console.error("Erro ao enviar log:", error);
  });
}

// Identifica o proprietário do ticket pelo tópico.
function getTicketOwner(channel) {
  if (!channel?.topic) return null;

  const match = channel.topic.match(/^ticket-owner:(\d+)/);

  return match ? match[1] : null;
}

// Procura tickets abertos de um membro.
async function findOpenTicket(guild, userId) {
  const channels = await guild.channels.fetch();

  return channels.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    getTicketOwner(channel) === userId
  ) || null;
}

// Verifica se um membro pode fechar um ticket.
function canCloseTicket(interaction, ownerId, supportRoleId) {
  const isOwner = interaction.user.id === ownerId;

  const isSupport = supportRoleId &&
    interaction.member.roles?.cache?.has(supportRoleId);

  const isAdmin = interaction.memberPermissions?.has(
    PermissionFlagsBits.ManageChannels
  );

  return Boolean(isOwner || isSupport || isAdmin);
}

// Cria o canal privado do ticket.
async function createTicket(interaction, subjectKey) {
  const config = getGuildConfig(interaction.guild.id);

  const subject = TICKET_SUBJECTS[subjectKey];

  if (!subject) {
    return interaction.reply({
      content: "Assunto inválido. Tente novamente pelo painel.",
      ephemeral: true
    });
  }

  if (!config.ticket_category_id || !config.support_role_id) {
    return interaction.reply({
      content: "O sistema de tickets ainda não foi configurado pela administração.",
      ephemeral: true
    });
  }

  const category = await interaction.guild.channels
    .fetch(config.ticket_category_id)
    .catch(() => null);

  const supportRole = await interaction.guild.roles
    .fetch(config.support_role_id)
    .catch(() => null);

  if (
    !category ||
    category.type !== ChannelType.GuildCategory ||
    !supportRole
  ) {
    return interaction.reply({
      content: "A categoria ou o cargo de suporte não existe mais. Peça à administração para configurar novamente.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const existingTicket = await findOpenTicket(
    interaction.guild,
    interaction.user.id
  );

  if (existingTicket) {
    return interaction.editReply({
      content: `Você já possui um atendimento aberto: ${existingTicket}`
    });
  }

  const safeName = interaction.user.username
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 15) || "membro";

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket-owner:${interaction.user.id} | assunto:${subjectKey}`,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: supportRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ]
  });

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_fechar")
      .setLabel("Fechar Atendimento")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x00D9FF)
    .setTitle(`${subject.emoji} ${subject.label}`)
    .setDescription(
      `Olá, <@${interaction.user.id}>!\n\n` +
      "Seu atendimento foi aberto com sucesso.\n\n" +
      `**Assunto:** ${subject.label}\n` +
      "**Descreva abaixo o que você precisa.**\n\n" +
      `A equipe <@&${supportRole.id}> irá atendê-lo em breve.\n\n` +
      "Quando o atendimento terminar, utilize o botão abaixo para fechar o ticket."
    )
    .setFooter({
      text: "XINXILALUNÁTICO • Central de Atendimento"
    })
    .setTimestamp();

  await ticketChannel.send({
    content: `<@${interaction.user.id}> <@&${supportRole.id}>`,
    embeds: [welcomeEmbed],
    components: [closeButton]
  });

  await interaction.editReply({
    content: `✅ Seu atendimento foi criado com sucesso: ${ticketChannel}`
  });

  await sendLog(
    interaction.guild,
    `🎫 **Ticket aberto**\n` +
    `**Membro:** ${interaction.user.tag}\n` +
    `**Assunto:** ${subject.emoji} ${subject.label}\n` +
    `**Canal:** ${ticketChannel}`,
    0x57F287
  );
}

// Inicialização.
client.once(Events.ClientReady, readyClient => {
  console.log(`XINXILALUNÁTICO online como ${readyClient.user.tag}`);

  readyClient.user.setActivity("gerenciando o servidor", {
    type: 0
  });
});

// Boas-vindas.
client.on(Events.GuildMemberAdd, async member => {
  const config = getGuildConfig(member.guild.id);

  if (!config.welcome_channel_id) return;

  const channel = await member.guild.channels
    .fetch(config.welcome_channel_id)
    .catch(() => null);

  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`🎉 Bem-vindo(a) ao ${member.guild.name}!`)
    .setDescription(
      `Olá, ${member}!\n\n` +
      "Se juntou ao Cafofo Espero que goste ❤️ É apertado, mas aconchegante." +
      "Leia as regras e aproveite nossa comunidade!"
    )
    .setThumbnail(member.user.displayAvatarURL())
    .addFields({
      name: "👥 Total de membros",
      value: `${member.guild.memberCount}`,
      inline: true
    })
    .setFooter({
      text: "XINXILALUNÁTICO • Seja bem-vindo!"
    })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);

  await sendLog(
    member.guild,
    `👋 ${member.user.tag} entrou no servidor.`
  );
});

// Saída de membros.
client.on(Events.GuildMemberRemove, async member => {
  const channel = member.guild.channels.cache.find(
    ch =>
      ch.isTextBased() &&
      ch.name.toLowerCase().includes("tchauzinho")
  );

  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("😥 Até logo!")
      .setDescription(
        `**${member.user?.tag || "Um membro"}** deixou o nosso cafofo!\n\n` +
        "Esperamos que volte algum dia! 💔"
      )
      .setThumbnail(
        member.user?.displayAvatarURL() || null
      )
      .addFields({
        name: "👥 Membros restantes",
        value: `${member.guild.memberCount}`,
        inline: true
      })
      .setFooter({
        text: "XINXILALUNÁTICO • Sentiremos sua falta!"
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(console.error);
  }

  await sendLog(
    member.guild,
    `🚪 ${member.user?.tag || member.id} saiu do servidor.`,
    0xED4245
  );
});
// Mensagens apagadas.
client.on(Events.MessageDelete, async message => {
  if (!message.guild || message.author?.bot) return;

  await sendLog(
    message.guild,
    `🗑️ Mensagem apagada em <#${message.channelId}> de ${message.author?.tag || "autor desconhecido"}.`
  );
});

// Interações do Discord.
client.on(Events.InteractionCreate, async interaction => {
  try {
    // BOTÕES.
    if (interaction.isButton()) {

      // Abrir menu de assuntos do ticket.
      if (interaction.customId === "ticket_abrir") {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("ticket_assunto")
          .setPlaceholder("Selecione o assunto do atendimento")
          .addOptions(
            Object.entries(TICKET_SUBJECTS).map(([value, subject]) => ({
              label: subject.label,
              value,
              emoji: subject.emoji,
              description: `Atendimento sobre ${subject.label.toLowerCase()}`
            }))
          );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
          content: "🎫 **Qual é o motivo do seu atendimento?**\nEscolha uma das opções abaixo:",
          components: [row],
          ephemeral: true
        });
      }

      // Fechar ticket.
      if (interaction.customId === "ticket_fechar") {
        const channel = interaction.channel;
        const ownerId = getTicketOwner(channel);

        if (!ownerId) {
          return interaction.reply({
            content: "Este canal não foi identificado como um ticket.",
            ephemeral: true
          });
        }

        const config = getGuildConfig(interaction.guild.id);

        if (
          !canCloseTicket(
            interaction,
            ownerId,
            config.support_role_id
          )
        ) {
          return interaction.reply({
            content: "Você não tem permissão para fechar este atendimento.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content: "🔒 Atendimento encerrado. Este canal será excluído em 5 segundos."
        });

        await sendLog(
          interaction.guild,
          `🔒 **Ticket fechado**\n` +
          `**Canal:** #${channel.name}\n` +
          `**Fechado por:** ${interaction.user.tag}\n` +
          `**Responsável:** <@${ownerId}>`,
          0xED4245
        );

        setTimeout(async () => {
          await channel.delete(
            "Ticket fechado pelo sistema de atendimento."
          ).catch(error => {
            console.error("Erro ao excluir ticket:", error);
          });
        }, 5000);

        return;
      }
    }

    // SELEÇÃO DO ASSUNTO DO TICKET.
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "ticket_assunto") {
        return createTicket(
          interaction,
          interaction.values[0]
        );
      }
    }

    // COMANDOS SLASH.
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guild } = interaction;

    // PING.
    if (commandName === "ping") {
      return interaction.reply({
        content: `🏓 Pong! Latência: ${client.ws.ping}ms`,
        ephemeral: true
      });
    }

    // ANUNCIAR.
    if (commandName === "anunciar") {
      const channel = interaction.options.getChannel("canal");
      const message = interaction.options.getString("mensagem");

      if (
        !channel.permissionsFor(client.user)?.has(
          PermissionFlagsBits.SendMessages
        )
      ) {
        return interaction.reply({
          content: "Não tenho permissão para enviar mensagens nesse canal.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x00D9FF)
        .setAuthor({
          name: "XINXILALUNÁTICO • CENTRAL DE AVISOS"
        })
        .setDescription(message)
        .setFooter({
          text: `Publicado por ${interaction.user.tag}`
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      return interaction.reply({
        content: "✅ Anúncio enviado.",
        ephemeral: true
      });
    }

    // GERENCIAR CARGOS.
    if (commandName === "cargo") {
      const sub = interaction.options.getSubcommand();
      const target = interaction.options.getMember("membro");
      const role = interaction.options.getRole("cargo");

      if (!target) {
        return interaction.reply({
          content: "Não encontrei esse membro no servidor.",
          ephemeral: true
        });
      }

      if (
        role.managed ||
        role.position >= guild.members.me.roles.highest.position
      ) {
        return interaction.reply({
          content: "Não posso gerenciar esse cargo. Verifique a hierarquia de cargos.",
          ephemeral: true
        });
      }

      if (
        target.id === guild.ownerId ||
        target.roles.highest.position >= guild.members.me.roles.highest.position
      ) {
        return interaction.reply({
          content: "A hierarquia de cargos impede essa ação.",
          ephemeral: true
        });
      }

      if (sub === "dar") {
        await target.roles.add(role);
      } else {
        await target.roles.remove(role);
      }

      return interaction.reply({
        content: `✅ Cargo ${sub === "dar" ? "adicionado a" : "removido de"} ${target.user.tag}.`,
        ephemeral: true
      });
    }

    // BANIMENTO E EXPULSÃO.
    if (commandName === "ban" || commandName === "kick") {
      const user = interaction.options.getUser("membro");
      const reason = interaction.options.getString("motivo") || "Não informado";

      const target = await guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!target) {
        return interaction.reply({
          content: "Esse usuário não está no servidor.",
          ephemeral: true
        });
      }

      if (
        target.id === guild.ownerId ||
        target.id === interaction.user.id ||
        target.roles.highest.position >= guild.members.me.roles.highest.position
      ) {
        return interaction.reply({
          content: "Não posso executar essa ação por causa da hierarquia de cargos.",
          ephemeral: true
        });
      }

      if (commandName === "ban") {
        await target.ban({
          reason: `${reason} | Moderador: ${interaction.user.tag}`
        });
      } else {
        await target.kick(
          `${reason} | Moderador: ${interaction.user.tag}`
        );
      }

      await sendLog(
        guild,
        `🛡️ ${user.tag} recebeu ${commandName === "ban" ? "banimento" : "expulsão"}.\n` +
        `**Motivo:** ${reason}\n` +
        `**Responsável:** ${interaction.user.tag}`,
        0xED4245
      );

      return interaction.reply({
        content: `✅ ${user.tag} foi ${commandName === "ban" ? "banido" : "expulso"}.`,
        ephemeral: true
      });
    }

    // LIMPAR MENSAGENS.
    if (commandName === "limpar") {
      const amount = interaction.options.getInteger("quantidade");

      const deleted = await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.reply({
        content: `🧹 ${deleted.size} mensagens apagadas. Mensagens com mais de 14 dias não podem ser removidas em lote.`,
        ephemeral: true
      });
    }

    // CONFIGURAR CANAIS.
    if (commandName === "configurar") {
      const sub = interaction.options.getSubcommand();
      const channel = interaction.options.getChannel("canal");

      if (sub === "boasvindas") {
        updateGuildConfig(guild.id, channel.id, null, null);
      }

      if (sub === "logs") {
        updateGuildConfig(guild.id, null, channel.id, null);
      }

      return interaction.reply({
        content: `✅ Canal de ${sub === "logs" ? "logs" : "boas-vindas"} definido como ${channel}.`,
        ephemeral: true
      });
    }

    // SUGESTÕES.
    if (commandName === "sugestao") {
      const text = interaction.options.getString("texto");
      const config = getGuildConfig(guild.id);

      const targetChannel = config.log_channel_id
        ? await guild.channels
            .fetch(config.log_channel_id)
            .catch(() => null)
        : null;

      if (!targetChannel?.isTextBased()) {
        return interaction.reply({
          content: "A equipe ainda não configurou o canal de registros para receber sugestões. Peça a um administrador para configurar /configurar logs.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("💡 Nova sugestão")
        .setDescription(text)
        .setFooter({
          text: `Enviada por ${interaction.user.tag}`
        })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] });

      return interaction.reply({
        content: "✅ Sua sugestão foi enviada à equipe. Obrigado!",
        ephemeral: true
      });
    }

    // PAINÉIS DE TAGS.
    if (commandName === "tags") {
      const sub = interaction.options.getSubcommand();

      if (sub === "painel") {
        const channel = interaction.options.getChannel("canal");

        if (!channel?.isTextBased() || !channel.send) {
          return interaction.reply({
            content: "Escolha um canal de texto válido.",
            ephemeral: true
          });
        }

        const botPermissions = channel.permissionsFor(client.user);

        if (
          !botPermissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
          ])
        ) {
          return interaction.reply({
            content: "Não tenho permissão para publicar nesse canal.",
            ephemeral: true
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const panels = createRolePanels();

        for (const panel of panels) {
          await channel.send(panel);
        }

        return interaction.editReply({
          content: `✅ Os seis painéis de tags foram publicados em ${channel}.`
        });
      }
    }


    // COMANDOS DE TICKETS.
    if (commandName === "ticket") {
      const sub = interaction.options.getSubcommand();

      if (sub === "configurar") {
        const category = interaction.options.getChannel("categoria");
        const supportRole = interaction.options.getRole("suporte");

        updateTicketConfig(
          guild.id,
          category.id,
          supportRole.id
        );

        return interaction.reply({
          content:
            "✅ Sistema de tickets configurado!\n" +
            `**Categoria:** ${category.name}\n` +
            `**Equipe:** ${supportRole}`,
          ephemeral: true
        });
      }

      if (sub === "painel") {
        const channel = interaction.options.getChannel("canal");
        const config = getGuildConfig(guild.id);

        if (
          !config.ticket_category_id ||
          !config.support_role_id
        ) {
          return interaction.reply({
            content: "Configure primeiro o sistema usando `/ticket configurar`.",
            ephemeral: true
          });
        }

        const panelEmbed = new EmbedBuilder()
          .setColor(0x00D9FF)
          .setTitle("🎫 CENTRAL DE ATENDIMENTO GERAL")
          .setDescription(
            "Precisa falar com nossa equipe?\n\n" +
            "Abra um atendimento para qualquer assunto:\n\n" +
            "❓ Dúvidas\n" +
            "🚨 Denúncias\n" +
            "💡 Sugestões\n" +
            "🤝 Parcerias\n" +
            "⚙️ Problemas\n" +
            "📩 Outros assuntos\n\n" +
            "Clique no botão abaixo para começar. Seu atendimento será privado."
          )
          .setFooter({
            text: "XINXILALUNÁTICO • Central de Atendimento"
          });

        const openButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_abrir")
            .setLabel("Abrir Atendimento")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({
          embeds: [panelEmbed],
          components: [openButton]
        });

        return interaction.reply({
          content: `✅ Painel publicado em ${channel}.`,
          ephemeral: true
        });
      }
    }

  } catch (error) {
    console.error("Erro ao executar interação:", error);
    console.error("Código do erro:", error.code || "Não informado");
    console.error("Detalhes:", error.message);

    const response = {
      content:
        `Ocorreu um erro: ${error.code || error.message || "Erro desconhecido"}. ` +
        "Confira o CMD para mais detalhes.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => null);
    } else {
      await interaction.reply(response).catch(() => null);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
