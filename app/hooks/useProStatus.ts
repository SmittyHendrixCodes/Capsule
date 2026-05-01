import { useAuth } from '../context/authContext';
import { useReceipts } from './useReceipts';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const FREE_CAPTURE_LIMIT = 15;
const FREE_EXPORT_LIMIT = 3;
const FREE_HISTORY_DAYS = 14;

export const useProStatus = () => {
  const { user, isGuest } = useAuth();
  const { receipts } = useReceipts();
  const [isPro, setIsPro] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  useEffect(() => {
    checkProStatus();
    checkExportCount();
  }, [user]);

  const checkProStatus = async () => {
    if (!user) {
      setIsPro(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    setIsPro(data?.plan === 'pro');
  };

  const checkExportCount = async () => {
    if (!user) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
      .from('exports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());
    
    setExportCount(count || 0);
  };

  // ── Capture limits ─────────────────────────────────
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthlyCaptures = receipts.filter(r => r.date.startsWith(thisMonth)).length;
  const capturesRemaining = Math.max(0, FREE_CAPTURE_LIMIT - monthlyCaptures);
  const canCapture = isPro || monthlyCaptures < FREE_CAPTURE_LIMIT;

  // ── Export limits ──────────────────────────────────
  const canExport = isPro || exportCount < FREE_EXPORT_LIMIT;
  const exportsRemaining = Math.max(0, FREE_EXPORT_LIMIT - exportCount);

  // ── Feature gates ──────────────────────────────────
  const canEditReceipt = isPro;
  const canUseDarkMode = isPro;
  const canUseSmartSummary = isPro;
  const canUseBatchUpload = isPro;
  const canUseDuplicateDetection = isPro;
  const canViewAllCharts = isPro;

  // ── Ledger filter ──────────────────────────────────
  const getFilteredReceipts = (allReceipts: any[]) => {
    if (isPro) return allReceipts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - FREE_HISTORY_DAYS);
    return allReceipts.filter(r => new Date(r.date) >= cutoff);
  };

  return {
    isPro,
    isGuest,
    canCapture,
    capturesRemaining,
    canExport,
    exportsRemaining,
    canEditReceipt,
    canUseDarkMode,
    canUseSmartSummary,
    canUseBatchUpload,
    canUseDuplicateDetection,
    canViewAllCharts,
    getFilteredReceipts,
    FREE_CAPTURE_LIMIT,
    FREE_EXPORT_LIMIT,
    FREE_HISTORY_DAYS,
  };
};