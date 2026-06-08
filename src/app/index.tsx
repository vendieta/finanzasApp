import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Switch, Alert } from 'react-native';
import { useStore, Transaction, QuickAction } from '../store/useStore';
import { colors } from '../constants/colors';
import { categories } from '../constants/categories';
import { Plus, CreditCard, Banknote, Trash2, Settings } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Dashboard() {
  const { 
    balance, 
    transactions, 
    quickActions, 
    setInitialData, 
    addTransaction, 
    deleteTransaction,
    addQuickAction,
    deleteQuickAction
  } = useStore();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  
  // Add Transaction Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0].name);
  const [isCard, setIsCard] = useState(false);

  // Customize Quick Actions Modal States
  const [quickActionsModalVisible, setQuickActionsModalVisible] = useState(false);
  const [isAddingQuickAction, setIsAddingQuickAction] = useState(false);
  
  // Add Quick Action Form States
  const [newActionName, setNewActionName] = useState('');
  const [newActionAmount, setNewActionAmount] = useState('');
  const [newActionCategory, setNewActionCategory] = useState(categories[0].name);
  const [newActionIsCard, setNewActionIsCard] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const txs = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC LIMIT 50;');
      const settings = await db.getAllAsync<{key: string, value: string}>('SELECT * FROM settings WHERE key = "initial_balance";');
      const qas = await db.getAllAsync<QuickAction>('SELECT * FROM quick_actions;');
      const initBalance = settings.length > 0 ? parseFloat(settings[0].value) : 0;
      setInitialData(initBalance, txs, qas);
    }
    loadData();
  }, []);

  // Save new manual transaction
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
    setIsCard(false);
    setSelectedCategory(categories[0].name);
  };

  // Perform quick action expense insertion
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

  // Delete transaction with double-confirmation prompt
  const handleDeletePress = (id: number) => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro de que deseas eliminar esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              '¿Confirmas la eliminación definitiva? Esta acción no se puede deshacer y recalculará tu saldo.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Eliminar', 
                  style: 'destructive',
                  onPress: () => executeDelete(id)
                }
              ]
            );
          }
        }
      ]
    );
  };

  const executeDelete = async (id: number) => {
    try {
      await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
      deleteTransaction(id);
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar la transacción.');
    }
  };

  // Save new custom Quick Action
  const handleAddQuickAction = async () => {
    if (!newActionName || !newActionAmount) {
      Alert.alert('Faltan datos', 'Por favor ingresa un nombre y un monto.');
      return;
    }
    const amt = parseFloat(newActionAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto válido mayor que cero.');
      return;
    }

    try {
      const result = await db.runAsync(
        'INSERT INTO quick_actions (name, amount, category, paymentMethod) VALUES (?, ?, ?, ?);',
        [newActionName, amt, newActionCategory, newActionIsCard ? 'CARD' : 'CASH']
      );

      addQuickAction({
        id: result.lastInsertRowId,
        name: newActionName,
        amount: amt,
        category: newActionCategory,
        paymentMethod: newActionIsCard ? 'CARD' : 'CASH',
      });

      // Clear fields
      setNewActionName('');
      setNewActionAmount('');
      setNewActionCategory(categories[0].name);
      setNewActionIsCard(false);
      setIsAddingQuickAction(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la acción rápida.');
    }
  };

  // Delete Quick Action
  const handleDeleteQuickAction = async (id: number) => {
    try {
      await db.runAsync('DELETE FROM quick_actions WHERE id = ?;', [id]);
      deleteQuickAction(id);
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar la acción rápida.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
      {/* HEADER SALDO */}
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Saldo Actual</Text>
        <Text style={[styles.balance, { color: balance < 0 ? colors.danger : colors.text }]}>
          ${balance.toFixed(2)}
        </Text>
      </View>

      {/* SECCIÓN ACCIONES RÁPIDAS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <TouchableOpacity 
          onPress={() => { setIsAddingQuickAction(false); setQuickActionsModalVisible(true); }} 
          style={styles.settingsBtn}
          activeOpacity={0.7}
        >
          <Settings color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsRow}>
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.id} 
            style={styles.quickActionBtn} 
            onPress={() => handleQuickAction(action.amount, action.category, action.paymentMethod)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionText} numberOfLines={1}>{action.name}</Text>
              <Text style={styles.quickActionSubtext}>-${action.amount.toFixed(2)}</Text>
            </View>
            {action.paymentMethod === 'CARD' ? (
              <CreditCard color={colors.textSecondary} size={16} />
            ) : (
              <Banknote color={colors.textSecondary} size={16} />
            )}
          </TouchableOpacity>
        ))}
        {quickActions.length === 0 && (
          <Text style={styles.emptyText}>No hay acciones rápidas. Toca el engrane para agregar una.</Text>
        )}
      </View>

      {/* SECCIÓN TRANSACCIONES RECIENTES */}
      <Text style={styles.sectionTitleMargin}>Transacciones Recientes</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txInfo}>
              <Text style={styles.txCategory}>{item.category}</Text>
              <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.txRightContainer}>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? colors.success : colors.text }]}>
                  {item.type === 'INCOME' ? '+' : '-'}${item.amount.toFixed(2)}
                </Text>
                <View style={styles.txMethodRow}>
                  {item.paymentMethod === 'CARD' ? (
                    <CreditCard color={colors.textSecondary} size={12} />
                  ) : (
                    <Banknote color={colors.textSecondary} size={12} />
                  )}
                  <Text style={styles.txMethodText}>
                    {item.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => handleDeletePress(item.id)} 
                style={styles.deleteTxBtn}
                activeOpacity={0.7}
              >
                <Trash2 color={colors.danger} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay transacciones registradas.</Text>
        }
      />

      {/* FAB - NUEVA TRANSACCIÓN MANUAL */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <Plus color="#FFF" size={28} />
      </TouchableOpacity>

      {/* MODAL NUEVA TRANSACCIÓN */}
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setAmount(''); setIsCard(false); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PERSONALIZAR ACCIONES RÁPIDAS */}
      <Modal visible={quickActionsModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {isAddingQuickAction ? (
              <View>
                <Text style={styles.modalTitle}>Nueva Acción Rápida</Text>
                
                <TextInput
                  style={styles.inputField}
                  placeholder="Nombre (ej. Cafecito, Almuerzo)"
                  placeholderTextColor={colors.textSecondary}
                  value={newActionName}
                  onChangeText={setNewActionName}
                  maxLength={15}
                />
                
                <TextInput
                  style={styles.inputField}
                  placeholder="Monto (ej. 3.50)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={newActionAmount}
                  onChangeText={setNewActionAmount}
                />

                <Text style={styles.fieldLabel}>Categoría</Text>
                <View style={styles.categoriesGrid}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryBtn, newActionCategory === c.name && styles.categoryBtnActive]}
                      onPress={() => setNewActionCategory(c.name)}
                    >
                      <Text style={[styles.categoryBtnText, newActionCategory === c.name && styles.categoryBtnTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.paymentMethodRow}>
                  <Text style={styles.methodLabel}>Pago con Tarjeta</Text>
                  <Switch 
                    value={newActionIsCard} 
                    onValueChange={setNewActionIsCard} 
                    trackColor={{ true: colors.primary, false: colors.border }} 
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddingQuickAction(false)}>
                    <Text style={styles.cancelBtnText}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddQuickAction}>
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ maxHeight: 420 }}>
                <Text style={styles.modalTitle}>Personalizar Acciones</Text>
                
                <FlatList
                  data={quickActions}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ marginBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.manageActionItem}>
                      <View>
                        <Text style={styles.manageActionName}>{item.name}</Text>
                        <Text style={styles.manageActionDetails}>
                          ${item.amount.toFixed(2)} • {item.category} • {item.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleDeleteQuickAction(item.id)} 
                        style={styles.deleteActionBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2 color={colors.danger} size={18} />
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No hay acciones rápidas. ¡Agrega una!</Text>
                  }
                />

                <TouchableOpacity style={styles.addActionButton} onPress={() => setIsAddingQuickAction(true)} activeOpacity={0.8}>
                  <Plus color="#FFF" size={20} />
                  <Text style={styles.addActionButtonText}>Agregar Acción</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setQuickActionsModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.closeBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  balanceLabel: { color: colors.textSecondary, fontSize: 16, marginBottom: 5 },
  balance: { fontSize: 48, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  sectionTitleMargin: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 15, marginTop: 15, textTransform: 'uppercase' },
  settingsBtn: { padding: 4 },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  quickActionBtn: { 
    minWidth: '47%', 
    flexGrow: 1, 
    backgroundColor: colors.card, 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  quickActionContent: { gap: 2 },
  quickActionText: { color: colors.text, fontSize: 14, fontWeight: '500', maxWidth: 100 },
  quickActionSubtext: { color: colors.textSecondary, fontSize: 12 },
  txCard: { backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  txInfo: { gap: 4 },
  txCategory: { color: colors.text, fontSize: 16, fontWeight: '500' },
  txDate: { color: colors.textSecondary, fontSize: 12 },
  txRightContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  txMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txMethodText: { color: colors.textSecondary, fontSize: 10 },
  deleteTxBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FF453A1A' },
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
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginVertical: 20, width: '100%' },
  
  // Customization styles
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20, textAlign: 'center' },
  inputField: { backgroundColor: colors.background, color: colors.text, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  fieldLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  manageActionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  manageActionName: { color: colors.text, fontSize: 16, fontWeight: '500' },
  manageActionDetails: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteActionBtn: { padding: 8 },
  addActionButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  addActionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: colors.background, padding: 15, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 16 },
});
