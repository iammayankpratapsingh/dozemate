import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useBluetooth } from '../../contexts/BluetoothProvider'; // Use the hook from our new context

const BluetoothConnectionScreen = () => {
  const {
    scannedDevices,
    connectedDevice,
    connectionStatus,
    requestPermissions,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
  } = useBluetooth();
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    const permissionsGranted = await requestPermissions();
    if (permissionsGranted) {
      setIsScanning(true);
      startScan();
      // Stop scanning after 10 seconds to save battery
      setTimeout(() => {
        stopScan();
        setIsScanning(false);
      }, 10000);
    } else {
      Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan for devices.');
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
      <Ionicons name="bluetooth-outline" size={24} color="#FFF" />
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceText}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <Text style={styles.deviceTextRssi}>RSSI: {item.rssi}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1D244D', '#02041A', '#1A1D3E']} style={styles.gradientBackground} />
      <View style={styles.header}>
        <Text style={styles.title}>Connect Your Ring</Text>
      </View>

      {connectedDevice ? (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.statusText}>Connected to</Text>
          <Text style={styles.deviceName}>{connectedDevice.name}</Text>
          <TouchableOpacity style={styles.button} onPress={disconnectDevice}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleScan} disabled={isScanning || connectionStatus === 'connecting'}>
            {isScanning || connectionStatus === 'connecting' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Scan for Devices</Text>
            )}
          </TouchableOpacity>
          <FlatList
            data={scannedDevices}
            renderItem={renderDeviceItem}
            keyExtractor={item => item.id}
            style={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No devices found. Make sure your device is nearby and in pairing mode.</Text>}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  button: {
    backgroundColor: 'rgba(74, 144, 226, 0.8)',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  list: { flex: 1 },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  deviceInfo: { marginLeft: 15, flex: 1 },
  deviceText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deviceId: { color: '#AAA', fontSize: 12 },
  deviceTextRssi: { color: '#AAA', fontSize: 14 },
  emptyText: { color: '#AAA', textAlign: 'center', marginTop: 50, paddingHorizontal: 20 },
  statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  statusText: { color: '#FFF', fontSize: 18, marginTop: 20 },
  deviceName: { color: '#4A90E2', fontSize: 22, fontWeight: 'bold', marginVertical: 10 },
});

export default BluetoothConnectionScreen;