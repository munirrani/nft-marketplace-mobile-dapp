import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome } from '@expo/vector-icons';

export default function DisclaimerScreen({ navigation }) {


  function lineHeight(fontSize: number) {
    const multiplier = (fontSize > 20) ? 1.5 : 1;
    return parseInt(fontSize + (fontSize * multiplier));
  }


  return (<>
     <SafeAreaView />
     <StatusBar style='dark'/>
      <ScrollView style={{flex: 1, paddingTop: getStatusBarHeight()}} contentContainerStyle={{paddingBottom: 80}}>
        <View style={{paddingHorizontal: 20}}>
            <Text style={{fontSize: 17, fontWeight: 'bold'}}>Disclaimer</Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
            Digitalizers Sdn. Bhd. undertake no responsibility for, and disclaim all liability arising from, 
            any inability of you to access the platform. 
            Digitalizers Sdn. Bhd. provide access to the platform on an “as is” and “as available” basis, 
            and make no representation, warranty, promise, or guaranty that the platform will be available or 
            fully operative at any time or on an uninterrupted or error-free basis. The platform may contain errors, 
            glitches, bugs, or other defects, and you understand and ackowledge of your sole and exclusive right to abandon this platform in the event of dissatisfaction.
            </Text>
        </View>

        <View style={{marginTop: 10, paddingHorizontal: 20}}>
            <Text style={{fontSize: 17, fontWeight: 'bold'}}>Privacy Policy</Text>
            <Text style={{marginTop:10, color: '#888888'}}>Last Updated: October 16, 2022</Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
            Digitalizers Sdn. Bhd. is committed to protecting your privacy. We have prepared this Privacy Policy to describe to you our practices regarding the Personal Data (as defined below) we collect, use, and share in connection with the Piksel mobile app. “NFT” in this Privacy Policy means a non-fungible token or similar digital item implemented on a blockchain (such as the Ethereum blockchain), which uses smart contracts to link to or otherwise be associated with certain content or data.
            </Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
            1. Third-Party Websites. Our Service may contain links to third-party websites. When you click on a link to any other website or location, you will leave our Service and go to another site, and another entity may collect Personal Data from you. We have no control over, do not review, and cannot be responsible for these third-party websites or their content. Please be aware that the terms of this Privacy Policy do not apply to these third-party websites or their content, or to any collection of your Personal Data after you click on links to such third-party websites. We encourage you to read the privacy policies of every website you visit. Any links to third-party websites or locations are for your convenience and do not signify our endorsement of such third parties or their products, content, or websites.
            </Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
              2. Third-Party Wallets. To use our Service, you must use a third-party wallet which allows you to engage in transactions on public blockchains. Your interactions with any third-party wallet provider are governed by the applicable terms of service and privacy policy of that third party.
              You are responsible for the security of your digital wallet, and we encourage you to take steps to ensure it is and remains secure. If you discover an issue related to your wallet, please contact your wallet provider.
            </Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
            3. Data Access and Control. Given the nature of blockchains being immutable, we cannot edit or delete any information that is stored on the blockchain, for example the Ethereum blockchain, as we do not have custody or control over them. The information stored on the blockchain may include purchases, sales, and transfers related to your blockchain address and NFTs held at that address.
            </Text>
            <Text style={{marginTop: 10, textAlign: 'justify', lineHeight: lineHeight(12)}}>
            4. Data Protection. We care about the security of your information and use physical, administrative, and technological safeguards to preserve the integrity and security of information collected through our Service. However, no security system is 100% secure and we cannot guarantee the security of our systems. In the event that any information under our custody and control is compromised as a result of a breach of security, we will take steps to investigate and remediate the situation.
            </Text>
        </View>
      </ScrollView>
    </>);
}
