import { FlatList, SafeAreaView, StyleSheet, TouchableOpacity, Image, Dimensions, View, Text, ImageBackground } from 'react-native';

import { db } from '../db-config';
import { getDocs, collection, query, where, setDoc, doc, increment, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { useFocusEffect } from '@react-navigation/native';
import {getStatusBarHeight} from "react-native-status-bar-height";

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(
    address.length - 4,
    address.length
  )}`;
}

export default function MarketPlaceScreen({ navigation }) {

  const [NFT, setNFTs] = useState([]);
  const [walletAddress, setWalletAddress] = useState<string>('')

  const walletConnector = useWalletConnect();

  const getAllInfo = useCallback(async() => {
    const q = query(collection(db, "NFT"), where("marketplace_metadata.isListed", "==", true));
    const querySnapshot = await getDocs(q);
    const document = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      document.push(data)
    })
    return document
  }, [])
  
  const checkWalletConnection = async() => {
    setWalletAddress(walletConnector.connected ? walletConnector.accounts[0] : "")
  }
  
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      
      const fetchData = async () => {
        try {
          const data = await getAllInfo()
          if (isActive) {
            console.log("isActive called")
            await checkWalletConnection()
            setNFTs(data)
          }
        } catch (e) {
        }
      };
      fetchData();
  
      return () => {
        isActive = false;
      };
    }, [walletAddress, getAllInfo])
  );

  async function incrementView(tokenId: number) {
    await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
      ["marketplace_metadata.listing_views"]: increment(1)
    })
  }

  const NFTCardView = (props: any) => {
    const aspectRatio = props.imgWidth / props.imgHeight

    const isUsersOwnNFT = (address: string) => address.toLowerCase() === walletAddress.toLowerCase()
    return (
      <TouchableOpacity onPress={props.navigation} activeOpacity={.75} style={{
        marginVertical: 15
      }}>
        <Image
            source={{uri: props.imgSource}}
            style={{
              width: Dimensions.get('window').width - 40,
              height: Dimensions.get('window').width / aspectRatio,
              borderRadius: 6,
            }} 
        />
        <View style={{marginVertical: 10, marginHorizontal: 5, flexDirection: 'row'}}>
          <View style={{flex: 2,}}>
            <Text numberOfLines={1} style={{fontWeight: 'bold', color: 'black', fontSize: 20}}>{props.name}</Text>
            <View style={{marginTop: 10, flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontSize: 12, color: '#aaaaaa'}}>
                { isUsersOwnNFT(props.owner) ? 
                "By You"
                  :
                "By " + shortenAddress(props.owner)
                }
              </Text>
            </View>
          </View>
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row'}}>
            <Image source={require('../assets/images/Ethereum-Logo-PNG.png')} style={{height: 25, width: 25, tintColor: '#666666'}}/>
            <Text style={{fontWeight: 'bold', color: '#666666', fontSize: 25, marginLeft: 3,}}>{props.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
      
  }

  const renderItem = ({ item }) => {
    return(                
        <NFTCardView  
          imgSource={item.nft_metadata.ipfs_image_url}
          imgWidth={item.image_metadata.width}
          imgHeight={item.image_metadata.height}
          name={item.nft_metadata.image_name}
          owner={item.nft_metadata.current_owner_address}
          price={item.marketplace_metadata.listing_price}
          seller={item.nft_metadata.current_owner_address}
          navigation={
            () => {
              incrementView(item.nft_metadata.token_id)
              return navigation.navigate('NFTDetails', { 
                nft_metadata: item.nft_metadata, 
                marketplace_metadata: item.marketplace_metadata, 
                image_metadata: item.image_metadata,
                wallet_address: walletAddress 
              })
            }
          }
        />
    )
  }

  return (
    <React.Fragment>
      <SafeAreaView/>
      <StatusBar style='dark'/>
        <FlatList 
          data={NFT}
          style={{backgroundColor: 'white'}}
          ListHeaderComponent={
              <Text style={{fontSize: 30, fontWeight: 'bold', alignSelf: 'center'}}>NFT Marketplace</Text>
          }
          ListHeaderComponentStyle={{height: 80, width: Dimensions.get('window').width, marginTop: getStatusBarHeight(), justifyContent: 'center'}}
          numColumns={1}
          renderItem={renderItem}
          contentContainerStyle={{
            alignItems: "center",
          }}
        />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
});
