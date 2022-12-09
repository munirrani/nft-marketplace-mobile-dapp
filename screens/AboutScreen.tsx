import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome } from '@expo/vector-icons';

export default function AboutScreen({ navigation }) {

    const Separator = (props: any) =>
        <View style={[{width:Dimensions.get('window').width, 
        backgroundColor:'#999999', opacity: .5, height:1}, props.style]} />

    const Option = (props: any) => 
    <View>
        <TouchableNativeFeedback onPress={props.onPress}>
            <View style={{paddingVertical: 15, justifyContent: 'center'}}>
                <Text style={{marginHorizontal: 20, fontSize: 16, fontWeight: "600"}}>{props.title}</Text>
                <Text style={{marginHorizontal: 20, fontSize: 14, fontWeight: "300", color: '#888888',marginTop: 5, }}>{props.content}</Text>
            </View>
        </TouchableNativeFeedback>
    </View>

    const OptionWithImage = (props: any) => 
    <View>
        <TouchableNativeFeedback onPress={props.onPress}>
            <View style={{paddingLeft: 20, paddingVertical: 15, alignItems: 'center', flexDirection: 'row'}}>
                <FontAwesome size={26} style={[{}, props.style]} {...props} />
                <View style={{flexGrow:1, marginHorizontal: 20,}}>
                    <Text style={{flexWrap: 'wrap', fontSize: 16, fontWeight: "600"}}>{props.title}</Text>
                    {!!props.content &&
                        <Text 
                            style={{
                                fontSize: 14, fontWeight: "300", 
                                color: '#888888',marginTop: 5, 
                                
                            }}>
                            {props.content}
                        </Text>
                    }
                </View>
            </View>
        </TouchableNativeFeedback>
    </View>

  return (<>
     <SafeAreaView />
     <StatusBar style='dark'/>
      <ScrollView style={{flex: 1, paddingTop: getStatusBarHeight()}} contentContainerStyle={{paddingBottom: 35}}>
        <View style={{padding:15, width: '100%', flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontSize: 25, fontWeight: 'bold'}}>About</Text>
        </View>
            <View style={{alignItems: 'center', alignContent: 'center', paddingVertical: 15}}>
                <Image 
                    source={require('../assets/images/piksel-icon.png')}
                    style={{width: 100, height: 100}}
                />
                <Text style={{color: '#aaaaaa', marginBottom: 30}}>V1.0</Text>
            </View>
            <Separator />
            <Text style={{marginTop: 30, paddingBottom: 15, marginLeft: 20, fontSize: 17, fontWeight: 'bold'}}>Information</Text>
            <Option 
                title={"About Digitalizers"} 
                content={"Read about the company behind Piksel and how it originated"}
                onPress={() => navigation.navigate("AboutCompany")}
            />
            <Option 
                title={"Disclaimer & Privacy Policy"} 
                content={"View disclaimers and privacy policy"}
                onPress={() => navigation.navigate("Disclaimer")}
            />
            <Option 
                title={"Frequently Asked Questions (FAQ)"} 
                content={"FAQ on what the technicalities behind Piksel"}
                onPress={() => navigation.navigate("FAQ")}
            />
            <Separator style={{marginTop: 15,}} />
            <Text style={{marginTop: 30, paddingBottom: 15, marginLeft: 20, fontSize: 17, fontWeight: 'bold'}}>Contact</Text>
            <OptionWithImage 
                name="envelope-square"
                title={"Send Us Feedback"} 
                content={"We would love to know your input so we can improve this application further!"}
                onPress={() => 
                    Linking.openURL(
                        "mailto:feedback@digitalizers.com.my?subject=Feedback%20about%20Piksel" +
                        "&body=Greetings%21%20I%20would%20like%20to%20give%20a%20feedback%20about%20Piksel."                        
                    )
                }
            />
            <OptionWithImage 
                name="twitter"
                title={"Twitter"} 
                content={"@digitalizers.my"}
                onPress={() => Linking.openURL("https://twitter.com/digitalizers.my")}
            />
            <OptionWithImage 
                name="instagram"
                title={"Instagram"} 
                content={"@digitalizers.my"}
                onPress={() => Linking.openURL("https://instagram.com/digitalizers.my")}
            />
            <OptionWithImage 
                name="phone-square"
                title={"Phone"} 
                content={"+603-12345678"}
                onPress={() => Linking.openURL("tel:603-12345678")}
            />
      </ScrollView>
    </>);
}
