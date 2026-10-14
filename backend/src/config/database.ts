import { Pool } from 'pg';
import { DATABASE_URL } from './env';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  connect: () => pool.connect(),
  end: () => pool.end(),
};

export default db;