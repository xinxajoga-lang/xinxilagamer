const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Verifica se o bot está online."),

  new SlashCommandBuilder()
    .setName("anunciar")
    .setDescription("Publica um anúncio em um canal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde o anúncio será publicado.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("mensagem")
        .setDescription("Texto do anúncio.")
        .setMaxLength(4000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("cargo")
    .setDescription("Adiciona ou remove um cargo de um membro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
      subcommand
        .setName("dar")
        .setDescription("Adiciona um cargo a um membro.")
        .addUserOption(option =>
          option
            .setName("membro")
            .setDescription("Membro que receberá o cargo.")
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("cargo")
            .setDescription("Cargo que será adicionado.")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remover")
        .setDescription("Remove um cargo de um membro.")
        .addUserOption(option =>
          option
            .setName("membro")
            .setDescription("Membro que perderá o cargo.")
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("cargo")
            .setDescription("Cargo que será removido.")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bane um membro do servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro que será banido.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("motivo")
        .setDescription("Motivo do banimento.")
        .setMaxLength(500)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa um membro do servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro que será expulso.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("motivo")
        .setDescription("Motivo da expulsão.")
        .setMaxLength(500)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("limpar")
    .setDescription("Apaga mensagens recentes deste canal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName("quantidade")
        .setDescription("Quantidade de mensagens (de 1 a 100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("configurar")
    .setDescription("Configura os canais do servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("boasvindas")
        .setDescription("Define o canal de boas-vindas.")
        .addChannelOption(option =>
          option
            .setName("canal")
            .setDescription("Canal que receberá as boas-vindas.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("logs")
        .setDescription("Define o canal de registros do servidor.")
        .addChannelOption(option =>
          option
            .setName("canal")
            .setDescription("Canal que receberá os registros.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("sugestao")
    .setDescription("Envia uma sugestão para a equipe.")
    .addStringOption(option =>
      option
        .setName("texto")
        .setDescription("Escreva sua sugestão.")
        .setMaxLength(4000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Configura e publica a central de atendimento.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("configurar")
        .setDescription("Define a categoria e a equipe dos tickets.")
        .addChannelOption(option =>
          option
            .setName("categoria")
            .setDescription("Categoria onde os tickets serão criados.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("suporte")
            .setDescription("Cargo da equipe que atenderá os tickets.")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("painel")
        .setDescription("Publica o painel de abertura de tickets.")
        .addChannelOption(option =>
          option
            .setName("canal")
            .setDescription("Canal onde o painel será publicado.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("tags")
    .setDescription("Publica o painel de seleção de cargos.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("painel")
        .setDescription("Publica os botões para os membros escolherem suas tags.")
        .addChannelOption(option =>
          option
            .setName("canal")
            .setDescription("Canal onde o painel de tags será publicado.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
];

module.exports = commands;