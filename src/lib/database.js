
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH ||
  path.resolve(__dirname, "../../xinxilalunatico.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    welcome_channel_id TEXT,
    log_channel_id TEXT,
    welcome_message TEXT DEFAULT 'Bem-vindo(a), {user}, ao servidor **{server}**!',
    ticket_category_id TEXT,
    support_role_id TEXT
  );
`);

const columns = db.prepare("PRAGMA table_info(guild_config)").all();
const columnNames = columns.map(column => column.name);

if (!columnNames.includes("ticket_category_id")) {
  db.exec("ALTER TABLE guild_config ADD COLUMN ticket_category_id TEXT");
}

if (!columnNames.includes("support_role_id")) {
  db.exec("ALTER TABLE guild_config ADD COLUMN support_role_id TEXT");
}

const getConfig = db.prepare(
  "SELECT * FROM guild_config WHERE guild_id = ?"
);

const ensureConfig = db.prepare(`
  INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)
`);

const updateConfig = db.prepare(`
  UPDATE guild_config SET
    welcome_channel_id = COALESCE(?, welcome_channel_id),
    log_channel_id = COALESCE(?, log_channel_id),
    welcome_message = COALESCE(?, welcome_message)
  WHERE guild_id = ?
`);

const updateTickets = db.prepare(`
  UPDATE guild_config SET
    ticket_category_id = ?,
    support_role_id = ?
  WHERE guild_id = ?
`);

module.exports = {
  db,

  getGuildConfig(guildId) {
    ensureConfig.run(guildId);
    return getConfig.get(guildId);
  },

  updateGuildConfig(guildId, welcomeChannelId, logChannelId, welcomeMessage) {
    ensureConfig.run(guildId);
    updateConfig.run(
      welcomeChannelId,
      logChannelId,
      welcomeMessage,
      guildId
    );
    return getConfig.get(guildId);
  },

  updateTicketConfig(guildId, categoryId, supportRoleId) {
    ensureConfig.run(guildId);
    updateTickets.run(categoryId, supportRoleId, guildId);
    return getConfig.get(guildId);
  }
};
