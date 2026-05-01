import { supabase } from './supabaseClient';
import {
  getReceipts as getSQLiteReceipts,
  saveReceipt as addSQLiteReceipt,
  deleteReceipt as deleteSQLiteReceipt,
  updateReceipt as updateSQLiteReceipt,
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