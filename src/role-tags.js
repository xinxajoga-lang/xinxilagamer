
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionsBitField
} = require("discord.js");

const TAGS = [
  { key: "hetero", name: "Hétero", emoji: "👫" },
  { key: "lgbt", name: "Lgbtqiapn+", emoji: "🏳️‍🌈" },
  { key: "18mais", name: "+18", emoji: "🍺", group: "idade" },
  { key: "18menos", name: "-18", emoji: "🍼", group: "idade" },
  { key: "ele", name: "Ele/Dele", emoji: "👨" },
  { key: "ela", name: "Ela/Dela", emoji: "👩" },
  { key: "homem", name: "Homem", emoji: "🚹" },
  { key: "mulher", name: "Mulher", emoji: "🚺" },
  { key: "gamer", name: "Gamer", emoji: "🎮" },
  { key: "streamer", name: "Streamers", emoji: "🖥️" },
  { key: "youtuber", name: "Youtubers", emoji: "📹" },
  { key: "gta", name: "Grand Theft Auto", emoji: "🚗" },
  { key: "fortnite", name: "Fortnite", emoji: "🔫" },
  { key: "valorant", name: "Valorant", emoji: "🎯" },
  { key: "minecraft", name: "Minecraft", emoji: "⛏️" }
];

const TAG_CATEGORIES = [
  { title: "🏳️ Orientação", keys: ["hetero", "lgbt"] },
  { title: "🔞 Faixa etária", keys: ["18mais", "18menos"] },
  { title: "💬 Pronomes", keys: ["ele", "ela"] },
  { title: "👥 Gênero", keys: ["homem", "mulher"] },
  { title: "🎥 Conteúdo", keys: ["gamer", "streamer", "youtuber"] },
  { title: "🎮 Jogos", keys: ["gta", "fortnite", "valorant", "minecraft"] }
];

function createRolePanels() {
  return TAG_CATEGORIES.map(category => {
    const buttons = category.keys
      .map(key => TAGS.find(tag => tag.key === key))
      .filter(Boolean)
      .map(tag =>
        new ButtonBuilder()
          .setCustomId(`tag:${tag.key}`)
          .setLabel(tag.name)
          .setEmoji(tag.emoji)
          .setStyle(ButtonStyle.Secondary)
      );

    const row = new ActionRowBuilder().addComponents(buttons);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(category.title)
      .setDescription(
        "Escolha as opções desejadas clicando nos botões abaixo.\n" +
        "Clique novamente para remover um cargo."
      )
      .setFooter({
        text: "XINXILALUNÁTICO • Seleção de cargos"
      });

    return {
      embeds: [embed],
      components: [row]
    };
  });
}

async function handleTagButton(interaction) {
  if (
    !interaction.isButton() ||
    !interaction.customId.startsWith("tag:")
  ) {
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const key = interaction.customId.slice(4);
    const tag = TAGS.find(item => item.key === key);

    if (!tag || !interaction.guild) {
      return interaction.editReply(
        "Não foi possível identificar esse cargo."
      );
    }

    const roles = await interaction.guild.roles.fetch();

    const expectedName = (tag.roleName || tag.name)
      .trim()
      .toLowerCase();

    const role = roles.find(
      item => item.name.trim().toLowerCase() === expectedName
    );

    if (!role) {
      return interaction.editReply(
        `O cargo **${tag.name}** não foi encontrado no servidor. Confira o nome nas configurações.`
      );
    }

    const botMember =
      interaction.guild.members.me ||
      await interaction.guild.members.fetch(interaction.client.user.id);

    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply(
        "Preciso da permissão **Gerenciar cargos** para fazer isso."
      );
    }

    if (
      role.managed ||
      role.position >= botMember.roles.highest.position
    ) {
      return interaction.editReply(
        `O cargo **${role.name}** precisa ficar abaixo do cargo do bot na hierarquia.`
      );
    }

    const member = await interaction.guild.members.fetch(
      interaction.user.id
    );

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return interaction.editReply(
        `✅ Cargo **${role.name}** removido!`
      );
    }

    // Impede que +18 e -18 sejam recebidos juntos.
    if (tag.group === "idade") {
      const otherAgeTags = TAGS.filter(
        item => item.group === "idade" && item.key !== tag.key
      );

      for (const otherTag of otherAgeTags) {
        const otherName = (otherTag.roleName || otherTag.name)
          .trim()
          .toLowerCase();

        const otherRole = roles.find(
          item => item.name.trim().toLowerCase() === otherName
        );

        if (otherRole && member.roles.cache.has(otherRole.id)) {
          await member.roles.remove(otherRole);
        }
      }
    }

    await member.roles.add(role);

    return interaction.editReply(
      `✅ Você recebeu o cargo **${role.name}**!`
    );

  } catch (error) {
    console.error("Erro nos botões de tags:", error);

    const message =
      "Não consegui alterar seu cargo. Confira se o bot tem a permissão Gerenciar cargos e se o cargo está abaixo do cargo do bot.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true
      }).catch(() => {});
    }
  }
}

function registerRoleTagHandler(client) {
  client.on(Events.InteractionCreate, handleTagButton);
}

module.exports = {
  createRolePanels,
  registerRoleTagHandler
};
