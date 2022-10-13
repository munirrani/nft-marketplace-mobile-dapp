/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { FontAwesome } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, ColorSchemeName, Pressable } from 'react-native';

import NFTDetailsScreen from '../screens/NFTDetailsScreen';
import MarketPlaceScreen from '../screens/MarketPlaceScreen';
import MintNFTScreen from '../screens/MintNFTScreen';
import MyNFTScreen from '../screens/MyNFTScreen';
import { RootStackParamList, RootTabParamList, RootTabScreenProps } from '../types';
import LinkingConfiguration from './LinkingConfiguration';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

export default function Navigation({ colorScheme }: { colorScheme: ColorSchemeName }) {
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'rgb(255, 255, 255)',
    },
  };

  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={MyTheme}>
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
      <Stack.Screen name="Root" component={BottomTabNavigator} options={{ 
        headerShown: false,
      }} />
      <Stack.Screen name="NFTDetails" component={NFTDetailsScreen} options={
        ({ navigation }) => ({ headerShown: false })
        } />
    </Stack.Navigator>
  );
}

/**
 * A bottom tab navigator displays tab buttons on the bottom of the display to switch screens.
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */
const BottomTab = createMaterialTopTabNavigator<RootTabParamList>();

function BottomTabNavigator() {

  return (
    <BottomTab.Navigator
      initialRouteName="MarketPlace"
      tabBarPosition="bottom"
      screenOptions={{
        tabBarIndicatorStyle: {height: 3, backgroundColor: "#000000"},
        tabBarInactiveTintColor: "#bbbbbb",
        tabBarActiveTintColor: "#000000",
        tabBarPressColor: "#dddddd",
        tabBarLabelStyle: {fontSize: 12},
      }}>
      <BottomTab.Screen
        name="MarketPlace"
        component={MarketPlaceScreen}
        options={({ navigation }: RootTabScreenProps<'MarketPlace'>) => ({
          tabBarIcon: ({ color }) => <TabBarIcon name="image"  color={color} />,
          headerShown: false,
        })}
      />
      <BottomTab.Screen
        name="MintNFT"
        component={MintNFTScreen}
        options={{
          tabBarLabel: 'Mint Photo',
          tabBarIcon: ({ color }) => <TabBarIcon name="cloud-upload" color={color} />,
        }}
      />
      <BottomTab.Screen
        name="MyNFT"
        component={MyNFTScreen}
        options={{
          tabBarLabel: 'My Photo',
          tabBarIcon: ({ color }) => <TabBarIcon name="bookmark" color={color} />,
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
  return <FontAwesome size={20} {...props} />;
}
