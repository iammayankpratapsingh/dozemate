import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Increased circle count for a richer effect
const CIRCLE_COUNT = 4; 
const CIRCLE_SIZE = 250; // Slightly larger for more presence

export default function ConnectLandingScreen() {
  const router = useRouter();
  const animatedValues = useRef([...Array(CIRCLE_COUNT)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Create a staggered, looping animation for each circle
    const animations = animatedValues.map((value) => {
      return Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 4000, // Slower duration for a breathing effect
          useNativeDriver: true,
        })
      );
    });

    // Stagger the start of each animation to create a ripple effect
    Animated.stagger(1000, animations).start();
  }, [animatedValues]);

  const handleScanPress = () => {
    router.push('/(bluetooth)/BluetoothScan');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1D244D', '#02041A', '#1A1D3E']}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Connect Your Ring</Text>
        <View style={styles.headerIconContainer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Turn on your SLIMiot Ring and make sure that Bluetooth is enabled on your device.
        </Text>

        {/* Concentric Circle Animation */}
        <View style={styles.animationContainer}>
          {animatedValues.map((value, index) => {
            // Scale from 0% to 100%
            const scale = value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });
            // Fade in and then fade out for a "breathing" effect
            const opacity = value.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 0.4, 0],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.circle,
                  {
                    backgroundColor: `rgba(74, 144, 226, ${0.3 - index * 0.05})`,
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              />
            );
          })}
          {/* Central Icon Container */}
          <View style={styles.iconContainer}>
            <Ionicons name="bluetooth" size={80} color="rgba(74, 144, 226, 0.9)" />
          </View>
        </View>
      </View>

      {/* Glass UI Actions Section */}
      <View style={styles.footer}>
        <BlurView intensity={25} tint="dark" style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleScanPress}>
            <Text style={styles.primaryButtonText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.secondaryText}>No SLIMiot ring yet? <Text style={{ fontWeight: 'bold' }}>Buy Now</Text></Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02041A',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'android' ? 50 : 0,
    paddingBottom: 10,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    top: 40,
  },
  animationContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    position: 'absolute',
  },
  iconContainer: {
    // This container ensures the icon is treated as a single block for centering
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
  },
  actionsContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 30,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#1D244D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});