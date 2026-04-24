import { useState, useEffect } from 'react';
import { Receipt } from '../types/receipt';
import { initDatabase, saveReceipt, getReceipts, deleteReceipt, updateReceipt } from '../services/database';

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setup();
  }, []);

  const setup = async () => {
    await initDatabase();
    await loadReceipts();
  };

  const loadReceipts = async () => {
    setLoading(true);
    const data = await getReceipts();
    setReceipts(data);
    setTimeout (() => setLoading(false), 500);
  };

  const addReceipt = async (receipt: Receipt) => {
    await saveReceipt(receipt);
    await loadReceipts();
  };

  const removeReceipt = async (id: number) => {
    await deleteReceipt(id);
    await loadReceipts();
  };

  const editReceipt = async (receipt: Receipt) => {
    await updateReceipt(receipt);
    await loadReceipts();
  };

  return {
    receipts,
    loading,
    addReceipt,
    removeReceipt,
    loadReceipts,
    editReceipt,
  };
};