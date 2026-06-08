import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Switch } from 'react-native';
import { useStore, Transaction } from '../store/useStore';
import { colors } from '../constants/colors';
import { categories } from '../constants/categories';
import { Plus, CreditCard, Banknote } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export default function Dashboard() {
  const { balance, transactions, setInitialData, addTransaction } = useStore();
  const db = useSQLiteContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0].name);
  const [isCard, setIsCard] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const txs = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC LIMIT 50;');
      const settings = await db.getAllAsync<{key: string, value: string}>('SELECT * FROM settings WHERE key = "initial_balance";');
      const initBalance = settings.length > 0 ? parseFloat(settings[0].value) : 0;
      setInitialData(initBalance, txs);
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!amount) return;
    const newTx: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      type: txType,
      category: txType === 'INCOME' ? 'Ingreso' : selectedCategory,
      paymentMethod: isCard ? 'CARD' : 'CASH',
      date: new Date().toISOString(),
    };

    const result = await db.runAsync(
      'INSERT INTO transactions (amount, type, category, paymentMethod, date) VALUES (?, ?, ?, ?, ?)',
      [newTx.amount, newTx.type, newTx.category, newTx.paymentMethod, newTx.date]
    );

    addTransaction({ ...newTx, id: result.lastInsertRowId } as Transaction);
    setModalVisible(false);
    setAmount('');
  };

  const handleQuickAction = async (quickAmount: number, category: string, method: 'CASH'|'CARD') => {
    const newTx: Omit<Transaction, 'id'> = {
      amount: quickAmount,
      type: 'EXPENSE',
      category: category,
      paymentMethod: method,
      date: new Date().toISOString(),
    };
    const result = await db.runAsync(
      'INSERT INTO transactions (amount, type, category, paymentMethod, date) VALUES (?, ?, ?, ?, ?)',
      [newTx.amount, newTx.type, newTx.category, newTx.paymentMethod, newTx.date]
    );
    addTransaction({ ...newTx, id: result.lastInsertRowId } as Transaction);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Saldo Actual</Text>
        <Text style={[styles.balance, { color: balance < 0 ? colors.danger : colors.text }]}>
          ${balance.toFixed(2)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAction(1.5, 'Transporte', 'CASH')}>
          <Text style={styles.quickActionText}>Pasaje -$1.50</Text>
          <Banknote color={colors.textSecondary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAction(3.0, 'Antojos', 'CASH')}>
          <Text style={styles.quickActionText}>Café -$3.00</Text>
          <Banknote color={colors.textSecondary} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txInfo}>
              <Text style={styles.txCategory}>{item.category}</Text>
              <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? colors.success : colors.text }]}>
                {item.type === 'INCOME' ? '+' : '-'}${item.amount.toFixed(2)}
              </Text>
              {item.paymentMethod === 'CARD' ? <CreditCard color={colors.textSecondary} size={16} /> : <Banknote color={colors.textSecondary} size={16} />}
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus color="#FFF" size={28} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setTxType('EXPENSE')} style={[styles.typeBtn, txType === 'EXPENSE' && styles.typeBtnActiveExpense]}>
                <Text style={styles.typeBtnText}>Gasto</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTxType('INCOME')} style={[styles.typeBtn, txType === 'INCOME' && styles.typeBtnActiveIncome]}>
                <Text style={styles.typeBtnText}>Ingreso</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputAmount}
              placeholder="$ 0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
              value={amount}
              onChangeText={setAmount}
            />

            {txType === 'EXPENSE' && (
              <View style={styles.categoriesGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryBtn, selectedCategory === c.name && styles.categoryBtnActive]}
                    onPress={() => setSelectedCategory(c.name)}
                  >
                    <Text style={[styles.categoryBtnText, selectedCategory === c.name && styles.categoryBtnTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.paymentMethodRow}>
              <Text style={styles.methodLabel}>Tarjeta</Text>
              <Switch value={isCard} onValueChange={setIsCard} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 30 },
  balanceLabel: { color: colors.textSecondary, fontSize: 16, marginBottom: 5 },
  balance: { fontSize: 48, fontWeight: 'bold' },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 15, marginTop: 10, textTransform: 'uppercase' },
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  quickActionBtn: { flex: 1, backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickActionText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  txCard: { backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  txInfo: { gap: 4 },
  txCategory: { color: colors.text, fontSize: 16, fontWeight: '500' },
  txDate: { color: colors.textSecondary, fontSize: 12 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.border },
  typeBtnActiveExpense: { backgroundColor: colors.danger + '33', borderWidth: 1, borderColor: colors.danger },
  typeBtnActiveIncome: { backgroundColor: colors.success + '33', borderWidth: 1, borderColor: colors.success },
  typeBtnText: { color: colors.text, fontWeight: 'bold' },
  inputAmount: { fontSize: 40, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 30 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryBtn: { backgroundColor: colors.background, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  categoryBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryBtnText: { color: colors.textSecondary, fontWeight: '500' },
  categoryBtnTextActive: { color: '#FFF' },
  paymentMethodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: 15, borderRadius: 12, marginBottom: 30 },
  methodLabel: { color: colors.text, fontSize: 16, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 16 },
  saveBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
