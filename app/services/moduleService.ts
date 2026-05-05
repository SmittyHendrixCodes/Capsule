import { supabase } from './supabaseClient';

export interface CustomModule {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export const DEFAULT_MODULES = [
  { id: 'work', name: 'Work Expense', emoji: '💼' },
  { id: 'tax', name: 'Tax', emoji: '🧾' },
  { id: 'personal', name: 'Personal', emoji: '🏠' },
  { id: 'general', name: 'General', emoji: '📁' },
];

const MAX_CUSTOM_MODULES = 12;

// ── Get Custom Modules ─────────────────────────────────
export const getCustomModules = async (userId: string): Promise<CustomModule[]> => {
  const { data, error } = await supabase
    .from('custom_modules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCustomModules error:', error);
    return [];
  }
  return data || [];
};

// ── Create Custom Module ───────────────────────────────
export const createCustomModule = async (
  userId: string,
  name: string,
  emoji: string = '📁'
): Promise<CustomModule | null> => {
  // Check limit
  const existing = await getCustomModules(userId);
  if (existing.length >= MAX_CUSTOM_MODULES) {
    return null;
  }

  const { data, error } = await supabase
    .from('custom_modules')
    .insert({ user_id: userId, name, emoji })
    .select()
    .single();

  if (error) {
    console.error('createCustomModule error:', error);
    return null;
  }
  return data;
};

// ── Update Custom Module ───────────────────────────────
export const updateCustomModule = async (
  moduleId: string,
  name: string,
  emoji: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('custom_modules')
    .update({ name, emoji })
    .eq('id', moduleId);

  if (error) {
    console.error('updateCustomModule error:', error);
    return false;
  }
  return true;
};

// ── Delete Custom Module ───────────────────────────────
export const deleteCustomModule = async (moduleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('custom_modules')
    .delete()
    .eq('id', moduleId);

  if (error) {
    console.error('deleteCustomModule error:', error);
    return false;
  }
  return true;
};

// ── Get All Modules (default + custom) ────────────────
export const getAllModules = async (userId?: string) => {
  if (!userId) return DEFAULT_MODULES;
  
  const custom = await getCustomModules(userId);
  return [
    ...DEFAULT_MODULES,
    ...custom.map(m => ({ id: m.id, name: m.name, emoji: m.emoji })),
  ];
};