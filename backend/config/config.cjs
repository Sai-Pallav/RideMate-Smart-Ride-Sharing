const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from parent workspace directory or local backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD === 'null' ? null : (process.env.DB_PASSWORD || null),
  database: process.env.DB_NAME || 'community_ridesharing',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: 'mysql',
  migrationStorageTableName: 'sequelize_meta'
};

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig
};
