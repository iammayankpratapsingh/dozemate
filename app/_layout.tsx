import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, 
        contentStyle: { backgroundColor: '#02041A' },
        animation: 'fade_from_bottom', // Use a simple fade for clean transitions
        animationDuration: 3000, // A faster duration feels more responsive
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(authentication)" />
    </Stack>
  );
}