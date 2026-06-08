import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { colors } from '../constants/colors';
import { useStore, Transaction } from '../store/useStore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, RefreshCcw } from 'lucide-react-native';
import { useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export default function SettingsScreen() {
  const { initialBalance, transactions, updateInitialBalance } = useStore();
  const db = useSQLiteContext();
  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saldo Inicial</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={balanceInput}
            onChangeText={setBalanceInput}
          />
          <TouchableOpacity style={styles.btn} onPress={handleUpdateBalance}>
            <RefreshCcw color="#FFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Download color="#FFF" size={20} />
          <Text style={styles.exportBtnText}>Exportar a JSON</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 30 },
  section: { marginBottom: 30 },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: colors.card, color: colors.text, padding: 15, borderRadius: 12, fontSize: 16 },
  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  exportBtn: { backgroundColor: colors.card, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  exportBtnText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
});
