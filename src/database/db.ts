import { SQLiteDatabase } from 'expo-sqlite';

export const migrateDbIfNeeded = async (db: SQLiteDatabase) => {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
      category TEXT NOT NULL,
      paymentMethod TEXT CHECK(paymentMethod IN ('CASH', 'CARD')) NOT NULL,
      date TEXT NOT NULL,
      description TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('initial_balance', '0');
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quick_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      paymentMethod TEXT CHECK(paymentMethod IN ('CASH', 'CARD')) NOT NULL
    );
  `);

  const existingQuickActions = await db.getAllAsync<{ id: number }>('SELECT id FROM quick_actions LIMIT 1;');
  if (existingQuickActions.length === 0) {
    await db.runAsync(
      "INSERT INTO quick_actions (name, amount, category, paymentMethod) VALUES ('Pasaje', 1.50, 'Transporte', 'CASH');"
    );
    await db.runAsync(
      "INSERT INTO quick_actions (name, amount, category, paymentMethod) VALUES ('Café', 3.00, 'Antojos', 'CASH');"
    );
  }
};
