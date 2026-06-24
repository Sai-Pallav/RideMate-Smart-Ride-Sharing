import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const testConn = async () => {
  console.log('Testing connection to MySQL...');
  console.log('Config:', {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? '***' : 'none'
  });

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD === 'your_password' ? '' : process.env.DB_PASSWORD
    });
    console.log('Successfully connected!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed with error:', err);
  }
};

testConn();
