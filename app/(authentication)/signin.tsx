import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import CustomAlert from '../../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State for the custom modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalInfo, setModalInfo] = useState({ title: '', message: '', isSuccess: false });

  // API endpoint from your Java code
  const LOGIN_URL = "http://byosense.com/hexaskin_db/login.php";

  const triggerModal = (title: string, message:string, isSuccess = false) => {
    setModalInfo({ title, message, isSuccess });
    setModalVisible(true);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      triggerModal("Validation Error", "Email and password fields cannot be empty.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          Password: password.trim(),
          remember_me: rememberMe ? "1" : "0",
        }),
      });

      const result = await response.json();

      if (result.status === 'success' && result.valid === '1') {
        if (result.emailverified === '1') {
          await AsyncStorage.setItem('session_token', result.hash);
          await AsyncStorage.setItem('user_email', email.trim());
          if (rememberMe) {
            await AsyncStorage.setItem('remember_me', 'true');
          } else {
            await AsyncStorage.removeItem('remember_me');
          }
          triggerModal("Success", "Login successful!", true);
        } else {
          triggerModal("Verification Needed", "Please verify your email before logging in.");
        }
      } else {
        triggerModal("Login Failed", result.message || "Invalid credentials or server error.");
      }
    } catch (error) {
      console.error("Login API Error:", error);
      triggerModal("Network Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    if (modalInfo.isSuccess) {
      router.replace('/(tabs)/home'); // Adjust this to your main app route
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={['#1D244D', '#02041A', '#1A1D3E']}
        style={styles.gradientBackground}
      />

      <CustomAlert
        visible={isModalVisible}
        title={modalInfo.title}
        message={modalInfo.message}
        onClose={handleCloseModal}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/login.png')}
          style={styles.headerImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Log in to continue your journey.</Text>

        <BlurView intensity={25} tint="dark" style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={22} color="rgba(255,255,255,0.7)" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={22} color="rgba(255,255,255,0.7)" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
              <MaterialCommunityIcons name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color="#FFFFFF" />
              <Text style={styles.checkboxLabel}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(authentication)/forgotpassword')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#1D244D" />
            ) : (
              <Text style={styles.signInButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </BlurView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(authentication)/signup')}>
            <Text style={[styles.footerText, { fontWeight: 'bold' }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 1,
  },
  headerImage: {
    width: width * 0.6,
    height: width * 0.5,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  signInButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#1D244D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});