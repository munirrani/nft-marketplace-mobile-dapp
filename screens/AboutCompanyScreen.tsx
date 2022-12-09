import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome } from '@expo/vector-icons';

export default function AboutCompanyScreen({ navigation }) {


  function lineHeight(fontSize: number) {
    const multiplier = (fontSize > 20) ? 1.5 : 1;
    return parseInt(fontSize + (fontSize * multiplier));
  }

  return (<>
     <SafeAreaView />
     <StatusBar style='dark'/>
      <ScrollView style={{flex: 1, paddingTop: getStatusBarHeight()}} contentContainerStyle={{marginHorizontal: 20, paddingBottom: 80}}>
          <Text style={{fontWeight: 'bold', fontSize: 20,}}>Who are we?</Text>
          <Text style={{marginTop: 10, fontSize: 14, textAlign: 'justify', lineHeight: lineHeight(12)}}>Digitalizers Sdn. Bhd. is a partnership business company established by three partners. This establishment is the brainchild of three partners in the Non-Fungible Token (NFT) industry. The outbreak of the idea has been an inspiration for the production of our company's mobile application product line. This business was established in early 2022 and received guidance from the University Malaya Entrepreneurship Secretariat (UMES).</Text>
          <Text style={{marginTop: 20, fontWeight: 'bold', fontSize: 20}}>Mission</Text>
          <Text style={{marginTop: 10, fontSize: 14, textAlign: 'justify', lineHeight: lineHeight(12)}}>Produce a variety of mobile applications in accordance with the requests from consumers at a time to facilitate the daily life of the consumers.</Text>
          <Text style={{marginTop: 20, fontWeight: 'bold', fontSize: 20,}}>Vision</Text>
          <Text style={{marginTop: 10, fontSize: 14, textAlign: 'justify', lineHeight: lineHeight(12)}}>Empowering and expanding the use of digital technology in various fields and services.</Text>
      </ScrollView>
    </>);
}
