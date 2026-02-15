import { useIsFocused } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const isFocused = useIsFocused();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.message, { color: theme.text }]}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (data.includes('soltip.app') || data.includes('tipsol://')) {
      try {
        const url = new URL(data);
        const params = new URLSearchParams(url.search);
        const address = params.get('address');
        const name = params.get('name');
        const bio = params.get('bio');
        const avatar = params.get('avatar');

        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 1];

        if (address) {
          router.push({
            pathname: '/pay/[username]',
            params: { username, address, name, bio, avatar }
          });

          setTimeout(() => setScanned(false), 2000);
        } else {
          Alert.alert('Invalid QR', 'This QR code does not contain a recipient address.', [
            { text: 'OK', onPress: () => setScanned(false) }
          ]);
        }

      } catch (e) {
        Alert.alert('Error', 'Could not parse QR code.', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
      }
    } else {
      Alert.alert('Scanned Data', data, [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip Camera</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overlay}>
            <Text style={{ color: 'white', textAlign: 'center', marginTop: 50, fontSize: 18, fontWeight: 'bold' }}>Scan SolTip QR Code</Text>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20 }} />
            </View>
            <Text style={{ color: 'white', textAlign: 'center', marginBottom: 50 }}>Point camera at QR code</Text>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  }
});
