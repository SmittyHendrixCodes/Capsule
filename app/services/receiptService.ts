import { supabase } from './supabaseClient';
import {
  getReceipts as getSQLiteReceipts,
  saveReceipt as addSQLiteReceipt,
  deleteReceipt as deleteSQLiteReceipt,
  updateReceipt as updateSQLiteReceipt,
  checkDuplicate as checkDuplicateSQLite,
} from './database';
import { Receipt } from '../types/receipt';

// ── Get Receipts ───────────────────────────────────────
export const getReceipts = async (userId?: string): Promise<Receipt[]> => {
  if (!userId) {
    return getSQLiteReceipts();
  }

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase getReceipts error:', error);
    return getSQLiteReceipts();
  }

  return data.map(r => ({
    id: r.id,
    merchant: r.merchant,
    date: r.date,
    total: r.total,
    category: r.category,
    items: r.items,
    description: r.description,
    module: r.module,
    cardLast4: r.card_last4,
    imageUri: r.image_url,
  }));
};

// ── Add Receipt ────────────────────────────────────────
export const addReceipt = async (
  receipt: Omit<Receipt, 'id'>,
  userId?: string
): Promise<void> => {
  if (!userId) {
    await addSQLiteReceipt(receipt);
    return;
  }

  const { error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      merchant: receipt.merchant,
      date: receipt.date,
      total: receipt.total,
      category: receipt.category,
      items: receipt.items,
      description: receipt.description,
      module: receipt.module,
      card_last4: receipt.cardLast4,
      image_url: receipt.imageUri,
    });

  if (error) {
    console.error('Supabase addReceipt error:', error);
    await addSQLiteReceipt(receipt);
  }
};

// ── Delete Receipt ─────────────────────────────────────
export const deleteReceipt = async (
  id: number | string,
  userId?: string
): Promise<void> => {
  if (!userId) {
    await deleteSQLiteReceipt(id as number);
    return;
  }

  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase deleteReceipt error:', error);
    await deleteSQLiteReceipt(id as number);
  }
};

// ── Update Receipt ─────────────────────────────────────
export const updateReceipt = async (
  receipt: Receipt,
  userId?: string
): Promise<void> => {
  if (!userId) {
    await updateSQLiteReceipt(receipt);
    return;
  }

  const { error } = await supabase
    .from('receipts')
    .update({
      merchant: receipt.merchant,
      date: receipt.date,
      total: receipt.total,
      category: receipt.category,
      items: receipt.items,
      description: receipt.description,
      module: receipt.module,
      card_last4: receipt.cardLast4,
      image_url: receipt.imageUri,
    })
    .eq('id', receipt.id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase updateReceipt error:', error);
    await updateSQLiteReceipt(receipt);
  }
};

// ── Check Duplicate Receipt ─────────────────────────────────────
export const checkFuzzyDuplicate = async (
  merchant: string,
  date: string,
  total: number,
  items: string,
  userId?: string,
  allowFuzzy: boolean = false,
): Promise<{ isDuplicate: boolean; isFuzzy: boolean; existing?: any }> => {
  
  const tolerance = Math.max(1.00, total * 0.05); // $1 or 5% whichever is higher
  const minTotal = total - tolerance;
  const maxTotal = total + tolerance;

  if (!userId) {
    // SQLite check
    const existing = await checkDuplicateSQLite(merchant, date, total);
    if (existing) return { isDuplicate: true, isFuzzy: false, existing };
    return { isDuplicate: false, isFuzzy: false };
  }

  // Supabase — check exact first
  const { data: exactMatch } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('merchant', merchant)
    .eq('date', date)
    .eq('total', total)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return { isDuplicate: true, isFuzzy: false, existing: exactMatch[0] };
  }

  // Fuzzy check — Pro only
  if (!allowFuzzy) return { isDuplicate: false, isFuzzy: false };

  // Fuzzy check — same merchant, same date, total within tolerance
  const { data: fuzzyMatch } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('merchant', merchant)
    .eq('date', date)
    .gte('total', minTotal)
    .lte('total', maxTotal)
    .limit(1);

  if (fuzzyMatch && fuzzyMatch.length > 0) {
    // Check item overlap
    const existingItems = fuzzyMatch[0].items.toLowerCase().split(',').map((i: string) => i.trim());
    const newItems = items.toLowerCase().split(',').map((i: string) => i.trim());
    
    const overlap = newItems.filter(item => 
      existingItems.some((ei: string) => ei.includes(item) || item.includes(ei))
    );
    
    const overlapPercent = overlap.length / Math.max(newItems.length, existingItems.length);
    
    if (overlapPercent >= 0.5) {
      return { isDuplicate: false, isFuzzy: true, existing: fuzzyMatch[0] };
    }
  }

  return { isDuplicate: false, isFuzzy: false };
};