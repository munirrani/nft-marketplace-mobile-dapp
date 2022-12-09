import { Dimensions, SafeAreaView, StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TouchableNativeFeedback, Linking, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { collection, getDocs, query } from 'firebase/firestore';
import { useScrollToTop } from '@react-navigation/native';
import { db } from '../db-config';

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function NewsScreen({ navigation }) {

    const [news, setNews] = useState([]);
    const flatList = useRef();
    useScrollToTop(flatList)

    const getNews = useCallback(async() => {
        const q = query(collection(db, "News"));
        const querySnapshot = await getDocs(q);
        const document = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          document.push(data)
        })
        setNews(document)
    }, [])

    useEffect(() => {
        getNews()
    }, [])
    
    const width = Dimensions.get('window').width - 30
    
    const renderItem = ({item}) => {

        const date = new Date(parseInt(item.publish_date.seconds) * 1000)
        return (<>
            <TouchableOpacity 
                onPress={() => navigation.navigate("NewsContent", {
                    author: item.author,
                    content: item.content,
                    image_url: item.image_url,
                    publish_date: item.publish_date.seconds,
                    title: item.title,
                })}
                style={{
                    shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
					borderRadius: 6, borderWidth: 2, borderColor:'#eeeeee',
                    width: width,
                    marginTop: 15, zIndex: 5,
                }}>
                <Image 
                    source={{uri: item.image_url}}
                    style={{
                        width: width - 3,
                        alignSelf: 'center',
                        height: width / 16 * 9,
                        flex: 3,
                        zIndex: 0,
                        borderTopLeftRadius: 6, borderTopRightRadius: 6,
                    }}
                />
                <View style={{width: '100%', 
                backgroundColor:'#eeeeee', height:1, zIndex: 4,}} />
                <View style={{flex: 1, padding: 20}}>
                    <Text style={{fontWeight: 'bold', fontSize: 18}}>{item.title}</Text>
                    <Text numberOfLines={3} style={{marginTop: 10, textAlign: 'justify'}}>
                        {item.content.join(" ")}
                    </Text>
                    <View style={{marginTop: 10, flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{fontSize: 12, color: "#aaaaaa"}}>{date.getDate()} {monthNames[date.getMonth()]} {date.getFullYear()}</Text>
                        <Text style={{fontSize: 12, color: "#aaaaaa", marginLeft: 10,}}>|</Text>
                        <Text style={{fontSize: 12, color: "#aaaaaa", marginLeft: 10,}}>{item.author}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </>)
    }

    return (<>
    <SafeAreaView />
    <StatusBar style='dark'/>
      <FlatList
          ref={flatList}
          data={news}
          style={{backgroundColor: 'white'}}
          ListHeaderComponent={
              <Text style={{padding: 15, fontSize: 28, fontWeight: 'bold',}}>News</Text>
          }
          ListHeaderComponentStyle={{width: Dimensions.get('window').width, 
            marginTop: getStatusBarHeight(),
          }}
          numColumns={1}
          renderItem={renderItem}
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: 20
          }}
        />
    </>);
}
