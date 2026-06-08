import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors } from '../constants/colors';
import { PieChart } from 'react-native-gifted-charts';
import { useMemo, useState } from 'react';

export default function Stats() {
  const { transactions } = useStore();
  const [filter, setFilter] = useState<'MONTH' | 'WEEK'>('MONTH');

  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const categoryTotals: Record<string, number> = {};
    let total = 0;

    expenses.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      total += tx.amount;
    });

    const colorPalette = [colors.primary, colors.danger, colors.success, '#FF9500', '#AF52DE'];
    
    return Object.keys(categoryTotals).map((key, index) => ({
      value: categoryTotals[key],
      color: colorPalette[index % colorPalette.length],
      text: `${Math.round((categoryTotals[key] / total) * 100)}%`,
      category: key,
    }));
  }, [transactions, filter]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estadísticas</Text>

      <View style={styles.chartContainer}>
        {chartData.length > 0 ? (
          <PieChart
            data={chartData}
            donut
            showText
            textColor="#FFF"
            radius={120}
            innerRadius={70}
            centerLabelComponent={() => {
              return (
                <View style={{justifyContent: 'center', alignItems: 'center'}}>
                  <Text style={{fontSize: 22, color: 'white', fontWeight: 'bold'}}>
                    ${chartData.reduce((acc, curr) => acc + curr.value, 0).toFixed(2)}
                  </Text>
                  <Text style={{fontSize: 14, color: colors.textSecondary}}>Total</Text>
                </View>
              );
            }}
          />
        ) : (
          <Text style={styles.emptyText}>No hay gastos registrados.</Text>
        )}
      </View>

      <View style={styles.legendContainer}>
        {chartData.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.category}</Text>
            <Text style={styles.legendValue}>${item.value.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 30 },
  chartContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
  legendContainer: { marginTop: 30, gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 15, borderRadius: 12 },
  legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: 10 },
  legendText: { color: colors.text, flex: 1, fontSize: 16 },
  legendValue: { color: colors.text, fontWeight: 'bold', fontSize: 16 },
});
