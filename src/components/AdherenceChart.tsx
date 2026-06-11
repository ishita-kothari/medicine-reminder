import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useAccessibility } from '../hooks/useAccessibility';
import { Spacing } from '../theme/spacing';

interface DayData {
  label: string;   // e.g. "Mon"
  taken: number;
  missed: number;
}

interface AdherenceChartProps {
  data: DayData[];
  title?: string;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 28;
const BAR_RADIUS = 6;

export default function AdherenceChart({ data, title }: AdherenceChartProps) {
  const { colors, textScale } = useAccessibility();

  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.taken + d.missed), 1);

  const totalWidth = data.length * (BAR_WIDTH + 12);

  return (
    <View accessible accessibilityLabel={title ?? 'Adherence chart'}>
      {title ? (
        <Text style={[styles.title, { color: colors.text, fontSize: 14 * textScale }]}>
          {title}
        </Text>
      ) : null}
      <Svg width={totalWidth} height={CHART_HEIGHT + 28}>
        {data.map((d, i) => {
          const x = i * (BAR_WIDTH + 12) + 6;
          const totalCount = d.taken + d.missed;
          const takenH = totalCount > 0 ? (d.taken / maxVal) * CHART_HEIGHT : 0;
          const missedH = totalCount > 0 ? (d.missed / maxVal) * CHART_HEIGHT : 0;

          return (
            <React.Fragment key={i}>
              {/* Missed bar (red, bottom) */}
              {missedH > 0 && (
                <Rect
                  x={x}
                  y={CHART_HEIGHT - takenH - missedH}
                  width={BAR_WIDTH}
                  height={missedH}
                  fill={colors.error}
                  rx={BAR_RADIUS}
                />
              )}
              {/* Taken bar (green, top) */}
              {takenH > 0 && (
                <Rect
                  x={x}
                  y={CHART_HEIGHT - takenH}
                  width={BAR_WIDTH}
                  height={takenH}
                  fill={colors.success}
                  rx={BAR_RADIUS}
                />
              )}
              {/* Empty placeholder */}
              {totalCount === 0 && (
                <Rect
                  x={x}
                  y={CHART_HEIGHT - 4}
                  width={BAR_WIDTH}
                  height={4}
                  fill={colors.border}
                  rx={2}
                />
              )}
              {/* Day label */}
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={CHART_HEIGHT + 18}
                textAnchor="middle"
                fill={colors.textSecondary}
                fontSize={10}
                fontWeight="600"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Taken</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Missed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginBottom: Spacing.sm },
  legend: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
});
