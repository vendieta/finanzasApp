import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { colors } from '../constants/colors';
import { useStore, Category } from '../store/useStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Download, RefreshCcw, Trash2, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { initialBalance, transactions, updateInitialBalance, categories, addCategory, deleteCategory } = useStore();
  const db = useSQLiteContext();
  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());
  const [newCatName, setNewCatName] = useState('');
  const insets = useSafeAreaInsets();

  const handleExport = async () => {
    try {
      const data = {
        initialBalance,
        transactions,
        exportedAt: new Date().toISOString()
      };
      const fileUri = `${FileSystem.documentDirectory}finanzas_export.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Éxito', 'Datos guardados en el almacenamiento local.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar los datos.');
    }
  };

  const handleUpdateBalance = async () => {
    const newBal = parseFloat(balanceInput);
    if (isNaN(newBal)) return;

    await db.runAsync('UPDATE settings SET value = ? WHERE key = "initial_balance"', [newBal.toString()]);
    updateInitialBalance(newBal);
    Alert.alert('Actualizado', 'Saldo inicial actualizado correctamente.');
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Faltan datos', 'Por favor ingresa un nombre para la categoría.');
      return;
    }
    const formatted = newCatName.trim().charAt(0).toUpperCase() + newCatName.trim().slice(1);
    
    if (categories.some(c => c.name.toLowerCase() === formatted.toLowerCase())) {
      Alert.alert('Error', 'Esta categoría ya existe.');
      return;
    }

    try {
      const result = await db.runAsync('INSERT INTO categories (name, icon) VALUES (?, ?);', [formatted, 'tag']);
      addCategory({ id: result.lastInsertRowId, name: formatted, icon: 'tag' });
      setNewCatName('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la categoría.');
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    // Check if category is currently used by any transaction
    const inUse = transactions.some(tx => tx.category.toLowerCase() === name.toLowerCase());
    if (inUse) {
      Alert.alert(
        'No se puede eliminar',
        `La categoría "${name}" está en uso por transacciones existentes. Debes cambiar de categoría o eliminar esas transacciones primero.`
      );
      return;
    }

    // Must have at least 1 category
    if (categories.length <= 1) {
      Alert.alert('No se puede eliminar', 'Debes tener al menos una categoría registrada.');
      return;
    }

    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de que deseas eliminar la categoría "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
              deleteCategory(id);
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la categoría.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top + 15 : 20 }]}>
      <Text style={styles.title}>Ajustes</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* SALDO INICIAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saldo Inicial</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={balanceInput}
              onChangeText={setBalanceInput}
            />
            <TouchableOpacity style={styles.btn} onPress={handleUpdateBalance} activeOpacity={0.7}>
              <RefreshCcw color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* GESTIÓN DE CATEGORÍAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestionar Categorías</Text>
          
          <View style={styles.categoryList}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <TouchableOpacity 
                  onPress={() => handleDeleteCategory(cat.id, cat.name)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 color={colors.danger} size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Nueva categoría (ej. Regalos)"
              placeholderTextColor={colors.textSecondary}
              value={newCatName}
              onChangeText={setNewCatName}
              maxLength={20}
            />
            <TouchableOpacity style={styles.btn} onPress={handleAddCategory} activeOpacity={0.7}>
              <Plus color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DATOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.7}>
            <Download color="#FFF" size={20} />
            <Text style={styles.exportBtnText}>Exportar a JSON</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 25 },
  section: { marginBottom: 30 },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: colors.card, color: colors.text, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 50 },
  exportBtn: { backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  exportBtnText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  
  // Category management styles
  categoryList: { gap: 8, marginBottom: 15 },
  categoryItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: colors.card, 
    paddingVertical: 12, 
    paddingHorizontal: 15, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  categoryName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  deleteBtn: { padding: 4 },
});
