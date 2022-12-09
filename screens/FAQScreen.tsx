import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome } from '@expo/vector-icons';
import {AccordionList} from 'react-native-accordion-list-view';

export default function FAQScreen({ navigation }) {

    const CONTENT = [
        {
          question: 'What is Non-Fungible Token?',
          answer: 'Non-Fungible Token is digital asset issued on blockchain — a public, immutable and auditable ledger system. ' +
          'It allows for artists (e.g photographers) to have full ownership their art work. ' + 
          'If you choose to sell your art to others, you can have a direct one-to-one relationship with them instead of through a trusted third party platform.',
        },
        {
          question: 'Can I mint a photograph without selling it?',
          answer: 'Yes you can. It is totally up to you either to sell it or not after the photograph is been minted. Your NFT you minted will only be accessible to you.',
        },
        {
          question: 'Why do I have to use Ethereum in order to transact in this app?',
          answer: 'Ethereum is the chosen smart contract platform to run the business logic behind this application. It has the largest blockchain ecosystem in the NFT space.' + 
          ' All transactions is done through its native currency Ether. Hence, all the transaction logic is also done in Ether. ' +
          'Despite that, we do look forward to a multi-chain future, where regardless of any blockchain platform (and its native cryptocurrency) you prefer, your NFT will always be accessible.',
        },
        {
          question: 'Can I sell the picture I minted on other marketplace?',
          answer: 'Definitely yes! Your picture NFT is following Ethereum\'s ERC721 standard, ' +
          'so whatever pictures you minted in this platform, will be recognized by other NFT marketplaces when you connect your wallet.',
        },
        {
            question: 'What if the photos I minted are taken or posted by other people?',
            answer: 'All minting transactions are timestamped. Hence, everyone can trace the history of who mints a photo first. Assumming you hold your own custody of your art, ' +
            'you can always make a claim that your NFT is minted first, even if others attempt to make a copy.\n\nWe are still working on implementing an image recognition system to detect stolen art before it is minted.',
        }
    ];

    function lineHeight(fontSize: number) {
        const multiplier = (fontSize > 20) ? 1.5 : 1;
        return parseInt(fontSize + (fontSize * multiplier));
    }

    return (<>
    <SafeAreaView />
    <StatusBar style='dark'/>
    <View style={{marginTop: 20, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Could not find the questions you are wondering?</Text>
        <Text 
            style={{marginTop: 10, color: "#4989ad"}}
            onPress={
                () => Linking.openURL(
                    "mailto:support@digitalizers.com.my?subject=Questions%20about%20Piksel" +
                    "&body=Greetings%21%20I%20would%20like%20to%20ask%20about%20"                        
                )
            }
            >
            Contact our support team!
        </Text>
    </View>
    <View style={{flex: 1, marginTop: 20, justifyContent: 'center', alignItems: 'center'}}>
            <AccordionList
                keyboardShouldPersistTaps="always"
                containerItemStyle = {{
                    shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
                    borderRadius: 6, borderWidth: 1.5, borderColor:'#eeeeee',
                    width: Dimensions.get('window').width - 20,
                }}
                data={CONTENT}
                customTitle={(item: any) => 
                    <View style={{flex:1, padding: 10, justifyContent: 'center',}}>
                        <Text style={{fontWeight: 'bold', lineHeight: lineHeight(12)}}>{item.question}</Text>
                    </View>
                }
                customBody={(item: any) => 
                    <View style={{flex:1, padding: 10, justifyContent: 'center',}}>
                        <Text style={{textAlign: 'justify', lineHeight: lineHeight(12)}}>{item.answer}</Text>
                    </View>
                }
                animationDuration={300}
            />
    </View>
    </>)
}
