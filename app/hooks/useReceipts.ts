import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '../types/receipt';
import { initDatabase } from '../services/database';
import {
  getReceipts,
  addReceipt,
  deleteReceipt,
  updateReceipt,
} from '../services/receiptService';
import { useAuth } from '../context/authContext';

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setup();
  }, []);

  const setup = async () => {
    await initDatabase(); // still needed for SQLite (guest users)
    await loadReceipts(); // now uses receiptService which picks SQLite or Supabase
  };

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    const data = await getReceipts(user?.id);
    setReceipts(data);
    setTimeout(() => setLoading(false), 500);
  }, [user?.id]);

  const addReceiptItem = useCallback(async (receipt: Omit<Receipt, 'id'>) => {
    await addReceipt(receipt, user?.id);
    await loadReceipts();
  }, [user?.id, loadReceipts]);

  const removeReceipt = useCallback(async (id: number | string) => {
    await deleteReceipt(id, user?.id);
    await loadReceipts();
  }, [user?.id, loadReceipts]);

  const editReceipt = useCallback(async (receipt: Receipt) => {
    await updateReceipt(receipt, user?.id);
    await loadReceipts();
  }, [user?.id, loadReceipts]);

  return {
    receipts,
    loading,
    loadReceipts,
    addReceipt: addReceiptItem,
    removeReceipt,
    editReceipt,
  };
};