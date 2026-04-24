import * as SQLite from 'expo-sqlite';
import { Receipt } from '../types/receipt';

const db = SQLite.openDatabaseSync('capsule.db');

export const initDatabase = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      total REAL NOT NULL,
      category TEXT NOT NULL,
      items TEXT NOT NULL,
      description TEXT NOT NULL,
      module TEXT NOT NULL DEFAULT 'general',
      imageUri TEXT,
      cardLast4 TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    ALTER TABLE receipts ADD COLUMN imageUri TEXT;
  `).catch(() => {});

  await db.execAsync(`
    ALTER TABLE receipts ADD COLUMN cardLast4 TEXT;
  `).catch(() => {});
};

export const saveReceipt = async (receipt: Receipt): Promise<number> => {
  const result = await db.runAsync(
    `INSERT INTO receipts (merchant, date, total, category, items, description, module, imageUri, cardLast4)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      receipt.merchant,
      receipt.date,
      receipt.total,
      receipt.category,
      JSON.stringify(receipt.items),
      receipt.description,
      receipt.module,
      receipt.imageUri || null,
      receipt.cardLast4 || 'Cash / Not Available',
    ]
  );
  return result.lastInsertRowId;
};

export const getReceipts = async (): Promise<Receipt[]> => {
  const rows = await db.getAllAsync<Receipt>(
    `SELECT * FROM receipts ORDER BY created_at DESC`
  );
  return rows.map(row => ({
    ...row,
    items: JSON.parse(row.items as unknown as string),
  }));
};

export const deleteReceipt = async (id: number): Promise<void> => {
  await db.runAsync(`DELETE FROM receipts WHERE id = ?`, [id]);
};

export const getReceiptsByModule = async (module: string): Promise<Receipt[]> => {
  const rows = await db.getAllAsync<Receipt>(
    `SELECT * FROM receipts WHERE module = ? ORDER BY created_at DESC`,
    [module]
  );
  return rows.map(row => ({
    ...row,
    items: JSON.parse(row.items as unknown as string),
  }));
};

export const checkDuplicate = async (
  merchant: string,
  date: string,
  total: number
): Promise<Receipt | null> => {
  const rows = await db.getAllAsync<Receipt>(
    `SELECT * FROM receipts 
     WHERE LOWER(merchant) = LOWER(?) 
     AND date = ? 
     AND total = ?
     LIMIT 1`,
    [merchant, date, total]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const updateReceipt = async (receipt: Receipt): Promise<void> => {
  await db.runAsync(
    `UPDATE receipts 
     SET merchant = ?, date = ?, total = ?, category = ?, items = ?, 
         description = ?, module = ?, cardLast4 = ?
     WHERE id = ?`,
    [
      receipt.merchant,
      receipt.date,
      receipt.total,
      receipt.category,
      typeof receipt.items === 'string' ? receipt.items : JSON.stringify(receipt.items),
      receipt.description,
      receipt.module,
      receipt.cardLast4 || 'Cash / Not Available',
      receipt.id!,
    ]
  );
};