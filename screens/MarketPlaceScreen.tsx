import { Dimensions, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDocs, increment, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { getStatusBarHeight } from "react-native-status-bar-height";
import { db } from '../db-config';
import { Web3Context } from '../util/Web3ContextProvider';

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(
    address.length - 4,
    address.length
  )}`;
}

export default function MarketPlaceScreen({ navigation }) {

  const walletConnector = useWalletConnect();
  
  const [NFT, setNFTs] = useState([]);

  const { shouldRefresh, ethereumPriceInMyr, setEthereumPriceInMyr } = useContext(Web3Context)
  
  const getAllInfo = useCallback(async() => {
    const q = query(collection(db, "NFT"), where("marketplace_metadata.isListed", "==", true));
    const querySnapshot = await getDocs(q);
    const document = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      document.push(data)
    })
    setNFTs(document)
  }, [])

  useEffect(() => {
      const getPrice = async() => 
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=myr")
        .then(res => res.json())
        .then(data => {
          setEthereumPriceInMyr(data.ethereum.myr)
      })
        
      getAllInfo()
      getPrice()


    }, [shouldRefresh])

  async function incrementView(tokenId: number) {
    await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
      ["marketplace_metadata.listing_views"]: increment(1)
    })
  }
  
  const NFTCardView = (props: any) => {
    const aspectRatio = props.imgWidth / props.imgHeight

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
                { props.isUsersOwnNFT ? 
                "By You"
                  :
                "By " + shortenAddress(props.seller)
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
    const seller = item.nft_metadata.owner_history[item.nft_metadata.owner_history.length - 1]

    return(                
        <NFTCardView  
          imgSource={item.nft_metadata.ipfs_image_url}
          imgWidth={item.image_metadata.width}
          imgHeight={item.image_metadata.height}
          name={item.nft_metadata.image_name}
          price={item.marketplace_metadata.listing_price}
          isUsersOwnNFT={walletConnector.connected ? seller.toLowerCase() == walletConnector.accounts[0].toLowerCase() : false}
          seller={seller}
          navigation={
            () => {
              incrementView(item.nft_metadata.token_id)
              return navigation.navigate('NFTDetails', { 
                nft_metadata: item.nft_metadata, 
                marketplace_metadata: item.marketplace_metadata, 
                image_metadata: item.image_metadata,
                ethereum_price: ethereumPriceInMyr
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
          extraData={walletConnector.connected}
          style={{backgroundColor: 'white'}}
          keyExtractor={(item, index) => item.nft_metadata.token_id}
          ListHeaderComponent={
              <Text style={{fontSize: 30, fontWeight: 'bold', alignSelf: 'center'}}>Piksel Marketplace</Text>
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
