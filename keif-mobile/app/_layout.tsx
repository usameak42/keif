import { View, StyleSheet } from "react-native";
import { withLayoutContext } from "expo-router";
import { createStackNavigator } from "@react-navigation/stack";
import type {
  StackCardStyleInterpolator,
  StackNavigationEventMap,
  StackNavigationOptions,
} from "@react-navigation/stack";
import type { StackNavigationState } from "@react-navigation/native";
import type { ParamListBase } from "@react-navigation/native";
import { useFonts, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/colors";

const { Navigator } = createStackNavigator();
const JsStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator);

// Filtration transition: drip-forward (push), rise-back (pop)
const filtrationInterpolator: StackCardStyleInterpolator = ({ current, next, layouts }) => {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // When this screen is being covered by a new screen (push on top),
  // next.progress animates from 0 to 1. We fade out and translate down.
  const nextTranslateY = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 40],
      })
    : 0;

  const nextOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 1;

  return {
    cardStyle: {
      opacity: next ? nextOpacity : opacity,
      transform: [{ translateY: next ? nextTranslateY : translateY }],
      backgroundColor: Colors.dominant,
    },
  };
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <JsStack
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: filtrationInterpolator,
          transitionSpec: {
            open: {
              animation: "timing",
              config: { duration: 350 },
            },
            close: {
              animation: "timing",
              config: { duration: 350 },
            },
          },
          cardStyle: { backgroundColor: Colors.dominant },
          gestureEnabled: true,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
});
