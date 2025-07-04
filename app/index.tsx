import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";


const { width } = Dimensions.get('window');

export default function Index() {

  const router = useRouter();

  
  // Animations
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const logoFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    

    // Initial fade-in for all content
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Gentle floating animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloatAnim, {
          toValue: 10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoFloatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Handlers
  const handleSignUp = () => router.push('/(authentication)/signup');
  const handleSignIn = () => router.push('/(authentication)/signin');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1D244D', '#02041A', '#1A1D3E']}
        style={styles.gradientBackground}
      />

      {/* Main content with fade-in animation */}
      <Animated.View style={[styles.content, { opacity: contentFadeAnim }]}>
        
        {/* Logo Section */}
        <Animated.View style={{ transform: [{ translateY: logoFloatAnim }] }}>
          <Image
            source={require("../assets/images/plawat_ring_transparent.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Plawat</Text>
          <Text style={styles.tagline}>"Smart rings for a Smarter You"</Text>
        </View>

        {/* Glass UI Actions Section */}
        <BlurView intensity={25} tint="dark" style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.signInText}>Already have an account? <Text style={{fontWeight: 'bold'}}>Log In</Text></Text>
          </TouchableOpacity>
        </BlurView>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#02041A',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    marginTop: '35%',

  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 'auto',
    marginTop: 90,
  },
  title: {
    fontSize: 36,
    fontWeight: 'black',
    fontStyle: 'normal',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    fontStyle: 'italic',
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
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});