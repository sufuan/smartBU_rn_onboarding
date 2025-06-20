import { useSubscriptionStatus } from '@/hooks/queries/useUserQuery';
import React from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';

interface TanStackQueryDebugProps {
  visible?: boolean;
}

export default function TanStackQueryDebug({ visible = true }: TanStackQueryDebugProps) {
  const { user, hasSubscription, isLoading } = useSubscriptionStatus();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 TanStack Query Debug</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Loading:</Text>
        <Text style={[styles.value, { color: isLoading ? '#FF9800' : '#4CAF50' }]}>
          {isLoading ? 'YES' : 'NO'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>User:</Text>
        <Text style={styles.value}>
          {user ? `${user.email} (${user.id})` : 'Not loaded'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Subscription:</Text>
        <Text style={[styles.value, { color: hasSubscription ? '#4CAF50' : '#F44336' }]}>
          {hasSubscription ? '✅ ACTIVE' : '❌ NONE'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Stripe ID:</Text>
        <Text style={styles.value}>
          {user?.stripeCustomerId || 'None'}
        </Text>
      </View>

      <Text style={styles.timestamp}>
        Last updated: {new Date().toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: scale(12),
    margin: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: verticalScale(8),
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
