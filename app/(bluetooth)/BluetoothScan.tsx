import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PREVIOUS_DEVICES_KEY = '@slimiot_previous_devices';
const bleManager = new BleManager();

// Permission request helper
const requestBlePermissions = async () => {
  if (Platform.OS === 'android') {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
    const granted = await PermissionsAndroid.requestMultiple(permissions);
    const allGranted = Object.values(granted).every(val => val === PermissionsAndroid.RESULTS.GRANTED);
    return allGranted;
  }
  return true;
};

export default function BluetoothScanScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [previousDevices, setPreviousDevices] = useState<{id: string, name: string | null}[]>([]);
  const [scannedDevices, setScannedDevices] = useState<Map<string, Device>>(new Map());
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const rotation = useRef(new Animated.Value(0)).current;

  const availableDevices = useMemo(() => {
    const previousDeviceIds = new Set(previousDevices.map(d => d.id));
    return Array.from(scannedDevices.values()).filter(d => !previousDeviceIds.has(d.id));
  }, [scannedDevices, previousDevices]);

  useEffect(() => {
    const loadPreviousDevices = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(PREVIOUS_DEVICES_KEY);
        if (jsonValue != null) {
          setPreviousDevices(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error("Failed to load previous devices.", e);
      }
    };
    loadPreviousDevices();
  }, []);

  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      console.log(`Bluetooth state changed to: ${state}`);
      if (state === 'PoweredOn') {
        startScan();
        subscription.remove();
      }
    }, true);

    return () => {
      bleManager.stopDeviceScan();
      subscription.remove();
    };
  }, []);

  // Effect to control the rotation animation based on scanning state
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    if (isScanning) {
      animation.start();
    } else {
      animation.stop();
      rotation.setValue(0); // Reset rotation when not scanning
    }

    return () => animation.stop();
  }, [isScanning, rotation]);

  const startScan = async () => {
    if (isScanning) return;

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for devices.');
      return;
    }

    bleManager.state().then(state => {
      if (state !== 'PoweredOn') {
        Alert.alert('Bluetooth is off', 'Please turn on Bluetooth to scan for devices.');
        return;
      }
      
      console.log('Starting BLE scan...');
      setScannedDevices(new Map());
      setIsScanning(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE Scan Error:', error);
          Alert.alert('Scanner Error', error.message);
          setIsScanning(false);
          return;
        }
        if (device && device.name) {
          console.log(`Found device: ${device.name} (${device.id})`);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setScannedDevices(prev => new Map(prev.set(device.id, device)));
        }
      });

      setTimeout(() => {
        if (bleManager) {
            console.log('Stopping BLE scan due to timeout.');
            bleManager.stopDeviceScan();
            setIsScanning(false);
        }
      }, 15000); // Scan for 15 seconds
    });
  };

  const saveDevice = async (device: { id: string; name: string | null }) => {
    try {
      console.log(`Saving device to AsyncStorage: ${device.name} (${device.id})`);
      const newPreviousDevices = [device, ...previousDevices.filter(d => d.id !== device.id)];
      const jsonValue = JSON.stringify(newPreviousDevices);
      await AsyncStorage.setItem(PREVIOUS_DEVICES_KEY, jsonValue);
      setPreviousDevices(newPreviousDevices);
    } catch (e) {
      console.error("Failed to save device.", e);
    }
  };

  const handleConnect = async (device: { id: string; name: string | null }) => {
    console.log(`[Connect] Attempting to connect to ${device.name} (${device.id})`);
    setConnectingId(device.id);
    bleManager.stopDeviceScan();
    console.log('[Connect] Scan stopped for connection attempt.');
    setIsScanning(false);

    try {
      console.log(`[Connect] Connecting to device ${device.id}...`);
      const connectedDevice = await bleManager.connectToDevice(device.id, { timeout: 15000 });
      console.log(`[Connect] Successfully connected to ${connectedDevice.name}.`);
      
      console.log(`[Connect] Discovering services for ${connectedDevice.name}...`);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log(`[Connect] Service discovery successful for ${connectedDevice.name}.`);
      
      await saveDevice(device);
      
      console.log(`[Connect] Navigating to success screen for ${device.name}.`);
      router.push({
        pathname: '/(bluetooth)/ConnectionSuccess',
        params: { deviceName: device.name },
      });

    } catch (error) {
      console.error(`[Connect] Connection failed for ${device.name} (${device.id}):`, error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}. The device may be out of range or busy.`);
    } finally {
      console.log(`[Connect] Finished connection attempt for ${device.name}.`);
      setConnectingId(null);
    }
  };

  const handleForget = async (deviceId: string) => {
    console.log(`Forgetting device: ${deviceId}`);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newDevices = previousDevices.filter(d => d.id !== deviceId);
    setPreviousDevices(newDevices);
    try {
      const jsonValue = JSON.stringify(newDevices);
      await AsyncStorage.setItem(PREVIOUS_DEVICES_KEY, jsonValue);
    } catch (e) {
      console.error("Failed to save after forgetting device.", e);
    }
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderDeviceItem = ({ item, section }: { item: { id: string; name: string | null }, section: { title: string } }) => {
    const isPrevious = section.title === 'Previously Connected';
    return (
      <BlurView intensity={25} tint="dark" style={styles.deviceItemContainer}>
        <View style={styles.deviceInfo}>
          <Ionicons name="hardware-chip-outline" size={24} color="rgba(255, 255, 255, 0.8)" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.deviceName} numberOfLines={1}>{item.name || 'Unknown Device'}</Text>
          </ScrollView>
        </View>
        <View style={styles.deviceActions}>
          {connectingId === item.id ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              {isPrevious && (
                <TouchableOpacity onPress={() => handleForget(item.id)} style={styles.forgetButton}>
                  <Ionicons name="close-circle-outline" size={24} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleConnect(item)} style={styles.connectButton}>
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BlurView>
    );
  };

  const sections = [
    ...(previousDevices.length > 0 ? [{ title: 'Previously Connected', data: previousDevices }] : []),
    { title: 'Available Devices', data: availableDevices },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1D244D', '#02041A', '#1A1D3E']} style={styles.gradientBackground} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Scan for Devices</Text>
        <View style={styles.headerIconContainer} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderDeviceItem}
        renderSectionHeader={({ section: { title, data } }) => {
          const isAvailableDevices = title === 'Available Devices';
          const showHeader = (title === 'Previously Connected' && data.length > 0) || isAvailableDevices;

          if (!showHeader) return null;

          return (
            <View style={[styles.availableHeader, isAvailableDevices && { marginTop: 20 }]}>
              <Text style={styles.listHeader}>{title}</Text>
              {isAvailableDevices && (
                <TouchableOpacity onPress={startScan} disabled={isScanning} style={styles.rescanIconContainer}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="refresh" size={22} color="#4A90E2" />
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.scanningContainer}>
            <Text style={styles.scanningText}>
              {isScanning ? 'Scanning for Dozemate devices...' : 'No devices found.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02041A' },
  gradientBackground: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: Platform.OS === 'android' ? 50 : 0, paddingBottom: 10 },
  headerIconContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerText: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  listHeader: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 16, fontWeight: '600', marginBottom: 15 },
  availableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceItemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  deviceInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
  scrollContent: { alignItems: 'center' },
  deviceName: { color: '#FFF', fontSize: 16, marginLeft: 15 },
  deviceActions: { flexDirection: 'row', alignItems: 'center' },
  connectButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15 },
  connectButtonText: { color: '#1D244D', fontWeight: 'bold' },
  forgetButton: { marginRight: 10 },
  scanningContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  scanningText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, textAlign: 'center' },
  rescanIconContainer: {
    padding: 5,
  },
});