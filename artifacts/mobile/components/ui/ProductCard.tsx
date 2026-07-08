import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

type Product = {
  id: number;
  name: string;
  sku?: string | null;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  unit: string;
  categoryName?: string | null;
  gstPercent: number;
};

type ProductCardProps = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: ProductCardProps) {
  const colors = useColors();
  const isLowStock = product.stockQuantity <= product.minimumStock;
  const isOutOfStock = product.stockQuantity === 0;

  const stockColor = isOutOfStock
    ? colors.destructive
    : isLowStock
    ? colors.warning
    : colors.success;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: colors.overlay }]}>
        <Feather name="package" size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.sku, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {product.categoryName ?? 'Uncategorized'}{product.sku ? ` · ${product.sku}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.price, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          ₹{product.sellingPrice.toLocaleString('en-IN')}
        </Text>
        <View style={[styles.stock, { backgroundColor: `${stockColor}18` }]}>
          <Text style={[styles.stockText, { color: stockColor, fontFamily: 'Inter_600SemiBold' }]}>
            {product.stockQuantity} {product.unit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14 },
  sku: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 15 },
  stock: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockText: { fontSize: 11 },
});
