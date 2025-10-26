import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';

const bleManager = new BleManager();

interface BluetoothState {
  scannedDevices: Device[];
  connectedDevice: Device | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
  requestPermissions(): Promise<boolean>;
  startScan(): void;
  stopScan(): void;
  connectToDevice(device: Device): Promise<void>;
  disconnectDevice(): void;
}

export function useBluetooth(): BluetoothState {
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'disconnecting'>('disconnected');
  const [deviceConnectionSubscription, setDeviceConnectionSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        subscription.remove();
      }
    }, true);
    return () => {
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        return (
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  };

  const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex(device => device.id === nextDevice.id) > -1;

  const startScan = () => {
    setScannedDevices([]);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan Error:', error);
        return;
      }
      if (device && device.name) {
        setScannedDevices(prevDevices => {
          if (!isDuplicateDevice(prevDevices, device)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });
  };

  const stopScan = () => {
    bleManager.stopDeviceScan();
  };

  const connectToDevice = async (device: Device) => {
    try {
      stopScan();
      setConnectionStatus('connecting');
      await bleManager.connectToDevice(device.id, { autoConnect: true });
      setConnectedDevice(device);
      setConnectionStatus('connected');

      const sub = bleManager.onDeviceDisconnected(device.id, (error, disconnectedDevice) => {
        console.log(`Device ${disconnectedDevice?.id} disconnected.`, error);
        setConnectedDevice(null);
        setConnectionStatus('disconnected');
        deviceConnectionSubscription?.remove();
      });
      setDeviceConnectionSubscription(sub);

    } catch (e) {
      console.error(`Failed to connect to ${device.id}`, e);
      setConnectionStatus('disconnected');
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        setConnectionStatus('disconnecting');
        deviceConnectionSubscription?.remove();
        await bleManager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        setConnectionStatus('disconnected');
      } catch (e) {
        console.error(`Failed to disconnect from ${connectedDevice.id}`, e);
      }
    }
  };

  return {
    scannedDevices,
    connectedDevice,
    connectionStatus,
    requestPermissions,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
  };
}