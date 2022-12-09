import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome } from '@expo/vector-icons';

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function NewsContentScreen({ route, navigation }) {

    const width = Dimensions.get('window').width - 40

    const { author, content, image_url, publish_date, title } = route.params;

    const date = new Date(parseInt(publish_date) * 1000)


    function lineHeight(fontSize: number) {
        const multiplier = (fontSize > 20) ? 1.5 : 1;
        return parseInt(fontSize + (fontSize * multiplier));
    }

    return (<>
        <SafeAreaView />
        <StatusBar style='dark'/>
        <ScrollView>
            <View style={{flex: 1, padding: 20}}>
                <Text style={{fontWeight: 'bold', fontSize: 23}}>
                    {title}
                </Text>
                <Image 
                    source={{uri: image_url}}
                    style={{
                        width: width,
                        height: width / 16 * 9,
                        marginTop: 20,
                        borderWidth: 2,
                        borderColor: "#eeeeee",
                        borderRadius: 6,
                    }}
                />
                <View style={{marginTop: 10, flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color: "#aaaaaa"}}>
                        {date.getDate()} {monthNames[date.getMonth()]} {date.getFullYear()}
                    </Text>
                    <Text style={{marginLeft: 10, color: "#aaaaaa"}}>
                        |
                    </Text>
                    <Text style={{marginLeft: 10, color: "#aaaaaa"}}>
                        {author}
                    </Text>
                </View>
                {content.map((data) => 
                    <Text style={{marginTop: 10, fontSize: 14,}}>
                        {data}
                    </Text>)
                }
            </View>
        </ScrollView>
    </>);
}
