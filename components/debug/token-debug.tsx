import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export default function TokenDebug() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const user = await AsyncStorage.getItem('user');
      
      setTokenInfo({
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
        hasUser: !!user,
        userEmail: user ? JSON.parse(user).email : 'None'
      });
    } catch (error) {
      console.error('Error checking token:', error);
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('user');
    Alert.alert('Cleared', 'Auth data cleared');
    checkToken();
  };

  useEffect(() => {
    checkToken();
  }, []);

  if (!tokenInfo) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Token Debug</Text>
      <Text>Has Token: {tokenInfo.hasToken ? '✅' : '❌'}</Text>
      <Text>Token Length: {tokenInfo.tokenLength}</Text>
      <Text>Token Preview: {tokenInfo.tokenPreview}</Text>
      <Text>Has User: {tokenInfo.hasUser ? '✅' : '❌'}</Text>
      <Text>User Email: {tokenInfo.userEmail}</Text>
      
      <Pressable style={styles.button} onPress={checkToken}>
        <Text style={styles.buttonText}>Refresh</Text>
      </Pressable>
      
      <Pressable style={[styles.button, styles.clearButton]} onPress={clearAuth}>
        <Text style={styles.buttonText}>Clear Auth</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
});
