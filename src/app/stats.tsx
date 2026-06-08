import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useStore, Transaction } from '../store/useStore';
import { colors } from '../constants/colors';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useMemo, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, CreditCard, Banknote } from 'lucide-react-native';

// Get start of the week (Monday) for a given date
const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  // Adjust so Monday is 0 index or offset accordingly
  // In JS getDay(), Sunday is 0, Monday is 1, ..., Saturday is 6
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekRange = (start: Date, end: Date) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];
  const year = start.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} - ${endDay} ${startMonth} ${year}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  }
};

const formatDayTitle = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  return `${days[dateObj.getDay()]}, ${dateObj.getDate()} de ${months[dateObj.getMonth()]}`;
};

export default function Stats() {
  const { transactions } = useStore();
  const insets = useSafeAreaInsets();
  
  // Weekly navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Calculate Monday to Sunday dates of the current week
  const { startOfWeek, endOfWeek, weekDayStrings } = useMemo(() => {
    const start = getStartOfWeek(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const days = Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      return getLocalDateString(dayDate);
    });

    return { startOfWeek: start, endOfWeek: end, weekDayStrings: days };
  }, [selectedDate]);

  // Group weekly expense totals
  const dayTotals = useMemo(() => {
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    return weekDayStrings.map((dayStr, index) => {
      const total = transactions
        .filter(tx => tx.type === 'EXPENSE' && getLocalDateString(new Date(tx.date)) === dayStr)
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        dayName: dayNames[index],
        dateStr: dayStr,
        total,
      };
    });
  }, [transactions, weekDayStrings]);

  // Find max expense day
  const { maxExpense, maxExpenseDayIndex, totalWeekExpense } = useMemo(() => {
    let max = 0;
    let maxIdx = -1;
    let total = 0;

    dayTotals.forEach((d, idx) => {
      total += d.total;
      if (d.total > max) {
        max = d.total;
        maxIdx = idx;
      }
    });

    return { maxExpense: max, maxExpenseDayIndex: maxIdx, totalWeekExpense: total };
  }, [dayTotals]);

  // Selected day index for detailed drill-down (0-6)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Sync selected day index when week days change
  useEffect(() => {
    const todayStr = getLocalDateString(new Date());
    const todayIdx = weekDayStrings.indexOf(todayStr);
    
    if (todayIdx !== -1) {
      setSelectedDayIndex(todayIdx);
    } else if (maxExpenseDayIndex !== -1) {
      setSelectedDayIndex(maxExpenseDayIndex);
    } else {
      setSelectedDayIndex(0);
    }
  }, [weekDayStrings, maxExpenseDayIndex]);

  // Prepare data for the BarChart
  const barData = useMemo(() => {
    return dayTotals.map((d, index) => {
      const isSelected = selectedDayIndex === index;
      const isMax = maxExpenseDayIndex === index && d.total > 0;
      
      let barColor = '#3A3A3C'; // Slate gray for inactive
      if (isSelected) {
        barColor = colors.primary; // Accent color when selected
      } else if (isMax) {
        barColor = colors.danger + 'AA'; // Soft red/accent color for maximum
      }

      return {
        value: d.total,
        label: d.dayName,
        frontColor: barColor,
        topLabelComponent: () => (
          <Text style={{ 
            color: isSelected ? colors.primary : colors.textSecondary, 
            fontSize: 9, 
            fontWeight: isSelected ? 'bold' : 'normal',
            marginBottom: 4 
          }}>
            {d.total > 0 ? `$${Math.round(d.total)}` : ''}
          </Text>
        ),
        onPress: () => setSelectedDayIndex(index),
      };
    });
  }, [dayTotals, selectedDayIndex, maxExpenseDayIndex]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    setSelectedDate(next);
  };

  // Detailed data for the selected day
  const selectedDayDetails = useMemo(() => {
    const dayInfo = dayTotals[selectedDayIndex];
    if (!dayInfo) return null;

    const dayExpenses = transactions.filter(tx => {
      return tx.type === 'EXPENSE' && getLocalDateString(new Date(tx.date)) === dayInfo.dateStr;
    });

    const categoryTotals: Record<string, number> = {};
    let total = 0;
    dayExpenses.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      total += tx.amount;
    });

    const categoryColors = {
      'Amigos': '#AF52DE',
      'Comida': '#FF9500',
      'Transporte': '#0A84FF',
      'Antojos': '#FF453A',
    };

    const pieData = Object.keys(categoryTotals).map((cat, idx) => {
      const colorPalette = [colors.primary, colors.danger, colors.success, '#FF9500', '#AF52DE'];
      const color = categoryColors[cat as keyof typeof categoryColors] || colorPalette[idx % colorPalette.length];
      
      return {
        value: categoryTotals[cat],
        color: color,
        text: `${Math.round((categoryTotals[cat] / total) * 100)}%`,
        category: cat,
      };
    });

    return {
      dayName: dayInfo.dayName,
      dateStr: dayInfo.dateStr,
      total,
      transactions: dayExpenses,
      pieData,
    };
  }, [dayTotals, selectedDayIndex, transactions]);

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top + 15 : 20 }]}>
      <Text style={styles.title}>Estadísticas</Text>

      {/* Selector de Semana */}
      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={handlePrevWeek} style={styles.navBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <View style={styles.weekInfoRow}>
          <Calendar color={colors.primary} size={18} />
          <Text style={styles.weekRangeText}>{formatWeekRange(startOfWeek, endOfWeek)}</Text>
        </View>
        <TouchableOpacity onPress={handleNextWeek} style={styles.navBtn} activeOpacity={0.7}>
          <ChevronRight color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Card de Resumen de la Semana */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Semana</Text>
            <Text style={styles.summaryValue}>${totalWeekExpense.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Día de más gasto</Text>
            {maxExpenseDayIndex !== -1 && maxExpense > 0 ? (
              <View style={styles.maxExpenseRow}>
                <TrendingUp color={colors.danger} size={16} />
                <Text style={[styles.summaryValue, { fontSize: 16, color: colors.danger }]}>
                  {dayTotals[maxExpenseDayIndex].dayName} (${maxExpense.toFixed(0)})
                </Text>
              </View>
            ) : (
              <Text style={[styles.summaryValue, { fontSize: 16, color: colors.textSecondary }]}>
                Ninguno
              </Text>
            )}
          </View>
        </View>

        {/* Gráfico de Barras Semanal */}
        <View style={styles.chartWrapper}>
          <Text style={styles.chartTitle}>Gastos por Día</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={barData}
              barWidth={24}
              spacing={18}
              barBorderRadius={6}
              hideRules
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold' }}
              noOfSections={3}
              maxValue={maxExpense > 0 ? maxExpense * 1.25 : 100}
              height={150}
              showFractionalValues={false}
              roundToDigits={0}
            />
          </View>
        </View>

        {/* Sección de Detalle del Día Seleccionado */}
        {selectedDayDetails && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>
              Detalle del {formatDayTitle(selectedDayDetails.dateStr)}
            </Text>

            {selectedDayDetails.total > 0 ? (
              <View style={styles.detailCard}>
                {/* Gráfico de Torta */}
                <View style={styles.pieContainer}>
                  <PieChart
                    data={selectedDayDetails.pieData}
                    donut
                    showText
                    textColor="#FFF"
                    textSize={11}
                    fontWeight="bold"
                    radius={85}
                    innerRadius={55}
                    centerLabelComponent={() => (
                      <View style={styles.pieCenterLabel}>
                        <Text style={styles.pieCenterAmount}>
                          ${selectedDayDetails.total.toFixed(0)}
                        </Text>
                        <Text style={styles.pieCenterText}>Gastado</Text>
                      </View>
                    )}
                  />
                </View>

                {/* Leyenda de Categorías */}
                <View style={styles.legendContainer}>
                  {selectedDayDetails.pieData.map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.category}</Text>
                      </View>
                      <Text style={styles.legendValue}>
                        ${item.value.toFixed(2)} ({item.text})
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Lista de Transacciones del Día */}
                <Text style={styles.txListTitle}>Transacciones</Text>
                <View style={styles.txList}>
                  {selectedDayDetails.transactions.map((tx) => (
                    <View key={tx.id} style={styles.txItem}>
                      <View style={styles.txLeft}>
                        <View style={styles.txIconContainer}>
                          {tx.paymentMethod === 'CARD' ? (
                            <CreditCard color={colors.text} size={16} />
                          ) : (
                            <Banknote color={colors.text} size={16} />
                          )}
                        </View>
                        <View>
                          <Text style={styles.txCategoryName}>{tx.category}</Text>
                          {tx.description && (
                            <Text style={styles.txDesc} numberOfLines={1}>
                              {tx.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.txAmount}>-${tx.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyDetailCard}>
                <Calendar color={colors.textSecondary} size={36} style={{ opacity: 0.6 }} />
                <Text style={styles.emptyDetailText}>No hay gastos registrados para este día.</Text>
                <Text style={styles.emptyDetailSubtext}>¡Excelente día para tu bolsillo!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  
  // Week Selector
  weekSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  navBtn: { 
    padding: 6, 
    borderRadius: 8, 
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  weekInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekRangeText: { color: colors.text, fontSize: 14, fontWeight: '600' },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },
  summaryLabel: { color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  maxExpenseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },

  // Chart Wrapper
  chartWrapper: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 25
  },
  chartTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  chartContainer: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },

  // Detail Section
  detailSection: { marginTop: 5 },
  detailTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  emptyDetailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 20
  },
  emptyDetailText: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 5 },
  emptyDetailSubtext: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },

  // Pie Chart
  pieContainer: { alignItems: 'center', marginVertical: 10 },
  pieCenterLabel: { justifyContent: 'center', alignItems: 'center' },
  pieCenterAmount: { fontSize: 20, color: 'white', fontWeight: 'bold' },
  pieCenterText: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Legend
  legendContainer: { marginTop: 25, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.text, fontSize: 14 },
  legendValue: { color: colors.textSecondary, fontSize: 13 },

  // Transaction List
  txListTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  txList: { gap: 10 },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  txCategoryName: { color: colors.text, fontSize: 14, fontWeight: '500' },
  txDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 2, maxWidth: 180 },
  txAmount: { color: colors.danger, fontSize: 14, fontWeight: 'bold' }
});
