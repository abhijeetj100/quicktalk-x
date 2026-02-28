const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://chat_user:chat_password@localhost:5432/chat_app'
});

module.exports = pool;
