import { supabase } from './supabaseClient';

export interface Group {
  id: string;
  user_id: string;
  name: string;
  purpose?: string;
  notes?: string;
  date_from?: string;
  date_to?: string;
  created_at: string;
}

// ── Get Groups ─────────────────────────────────────────
export const getGroups = async (userId: string): Promise<Group[]> => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getGroups error:', error);
    return [];
  }
  return data || [];
};

// ── Create Group ───────────────────────────────────────
export const createGroup = async (
  userId: string,
  group: Omit<Group, 'id' | 'user_id' | 'created_at'>
): Promise<Group | null> => {
  const { data, error } = await supabase
    .from('groups')
    .insert({ user_id: userId, ...group })
    .select()
    .single();

  if (error) {
    console.error('createGroup error:', error);
    return null;
  }
  return data;
};

// ── Update Group ───────────────────────────────────────
export const updateGroup = async (
  groupId: string,
  updates: Partial<Omit<Group, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> => {
  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId);

  if (error) {
    console.error('updateGroup error:', error);
    return false;
  }
  return true;
};

// ── Delete Group ───────────────────────────────────────
export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('deleteGroup error:', error);
    return false;
  }
  return true;
};

// ── Assign Receipt to Group ────────────────────────────
export const assignReceiptToGroup = async (
  receiptId: string | number,
  groupId: string | null
): Promise<boolean> => {
  const { error } = await supabase
    .from('receipts')
    .update({ group_id: groupId })
    .eq('id', receiptId);

  if (error) {
    console.error('assignReceiptToGroup error:', error);
    return false;
  }
  return true;
};

// ── Get Group Receipt Count and Total ─────────────────
export const getGroupStats = async (groupId: string): Promise<{ count: number; total: number }> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('total')
    .eq('group_id', groupId);

  if (error || !data) return { count: 0, total: 0 };

  return {
    count: data.length,
    total: data.reduce((sum, r) => sum + Number(r.total), 0),
  };
};