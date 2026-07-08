import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

type BarData = {
  month: string;
  revenue: number;
};

type BarChartProps = {
  data: BarData[];
  height?: number;
  currency?: string;
};

export function BarChart({ data, height = 180, currency = '₹' }: BarChartProps) {
  const colors = useColors();
  const width = 320;
  const paddingTop = 20;
  const paddingBottom = 40;
  const paddingLeft = 10;
  const paddingRight = 10;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const barWidth = Math.floor((chartWidth / data.length) * 0.6);
  const gap = Math.floor(chartWidth / data.length);

  const formatVal = (v: number) => {
    if (v >= 100000) return `${currency}${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `${currency}${(v / 1000).toFixed(0)}K`;
    return `${currency}${v.toFixed(0)}`;
  };

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width={width} height={height + paddingTop}>
        {data.map((d, i) => {
          const barH = Math.max((d.revenue / maxVal) * chartHeight, 4);
          const x = paddingLeft + i * gap + (gap - barWidth) / 2;
          const y = paddingTop + chartHeight - barH;
          const isActive = d.revenue === maxVal;

          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={isActive ? colors.primary : colors.overlay.replace('0.06', '0.3')}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height + paddingTop - 8}
                textAnchor="middle"
                fontSize={10}
                fill={colors.mutedForeground}
                fontFamily="Inter_400Regular"
              >
                {d.month}
              </SvgText>
              {isActive && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill={colors.primary}
                  fontFamily="Inter_600SemiBold"
                >
                  {formatVal(d.revenue)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke={colors.border}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}
