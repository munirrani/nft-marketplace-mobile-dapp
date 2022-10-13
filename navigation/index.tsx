/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { FontAwesome } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, ColorSchemeName, Pressable } from 'react-native';

import Colors from '../constants/Colors';
import useColorScheme from '../hooks/useColorScheme';
import NFTDetailsScreen from '../screens/NFTDetailsScreen';
import MarketPlaceScreen from '../screens/MarketPlaceScreen';
import MintNFTScreen from '../screens/MintNFTScreen';
import MyNFTScreen from '../screens/MyNFTScreen';
import { RootStackParamList, RootTabParamList, RootTabScreenProps } from '../types';
import LinkingConfiguration from './LinkingConfiguration';
import WalletLoginButton from '../components/WalletLoginButton';

export default function Navigation({ colorScheme }: { colorScheme: ColorSchemeName }) {

  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={colorScheme === 'dark' ? DefaultTheme : DefaultTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

/**
 * A root stack navigator is often used for displaying modals on top of all other content.
 * https://reactnavigation.org/docs/modal
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Root" component={BottomTabNavigator} options={{ headerShown: false, }} />
      <Stack.Screen name="NFTDetails" component={NFTDetailsScreen} options={
        ({ navigation }) => ({ headerShown: false, animation: 'slide_from_right' })
        } />
    </Stack.Navigator>
  );
}

/**
 * A bottom tab navigator displays tab buttons on the bottom of the display to switch screens.
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */
const BottomTab = createBottomTabNavigator<RootTabParamList>();

function BottomTabNavigator() {
  const colorScheme = useColorScheme();

  return (
    <BottomTab.Navigator
      initialRouteName="MarketPlace"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
      }}>
      <BottomTab.Screen
        name="MarketPlace"
        component={MarketPlaceScreen}
        options={({ navigation }: RootTabScreenProps<'MarketPlace'>) => ({
          tabBarIcon: ({ color }) => <TabBarIcon name="image" color={color} />,
          headerShown: false,
        })}
      />
      <BottomTab.Screen
        name="MintNFT"
        component={MintNFTScreen}
        options={{
          title: 'Mint Photo',
          headerTitleStyle: {
            fontSize: 25,
          },
          tabBarIcon: ({ color }) => <TabBarIcon name="cloud-upload" color={color} />,
          headerRight: () => <WalletLoginButton />,
        }}
      />
      <BottomTab.Screen
        name="MyNFT"
        component={MyNFTScreen}
        options={{
          title: 'My Photo',
          headerTitleStyle: {
            fontSize: 25,
          },
          tabBarIcon: ({ color }) => <TabBarIcon name="bookmark" color={color} />,
          headerRight: () => <WalletLoginButton />,
        }}
      />
    </BottomTab.Navigator>
  );
}

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={25} style={{ marginBottom: -3 }} {...props} />;
}
