import { FlatList, SafeAreaView, StyleSheet, TouchableOpacity, Image, Dimensions, View, Text, ImageBackground } from 'react-native';

import { db } from '../db-config';
import { getDocs, collection, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useWalletConnect } from '@walletconnect/react-native-dapp';

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

  useEffect(() => {

    const checkWalletConnection = async() => {
      setWalletAddress(walletConnector.connected ? walletConnector.accounts[0] : "")
    }

    const getAllInfo = async() => {
      const q = query(collection(db, "NFT"), where("marketplace_metadata.isListed", "==", true));
      const querySnapshot = await getDocs(q);
      const document = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        document.push(data)
      })
      setNFTs(document);
    }

    checkWalletConnection()
    getAllInfo()
  }, []);


  function useImageAspectRatio(imageUrl: string) {
    const [aspectRatio, setAspectRatio] = useState(1);
  
    useEffect(() => {
      if (!imageUrl) {
        return;
      }
  
      let isValid = true;
      Image.getSize(imageUrl, (width, height) => {
        if (isValid) {
          setAspectRatio(width / height);
        }
      });
  
      return () => {
        isValid = false;
      };
    }, [imageUrl]);
  
    return aspectRatio;
  }    

  const NFTCardView = (props: any) => {
    const aspectRatio = useImageAspectRatio(props.imgSource)

    const isUsersOwnNFT = (address: string) => address.toLowerCase() === walletAddress.toLowerCase()

    return (
      <TouchableOpacity onPress={props.navigation} activeOpacity={0.95} style={{
        marginTop: 10, borderRadius: 8, borderWidth: 1,
      }}>
        <ImageBackground
            source={{uri: props.imgSource}}
            style={{
              width: Dimensions.get('window').width - 20,
              height: Dimensions.get('window').width / aspectRatio,
              flexDirection: 'row',
              alignItems: 'flex-end',
            }}>
            <View style={{position: 'absolute', width: '100%', height:'100%', backgroundColor: 'rgba(0,0,0,0.3)'}} />
            <View style={{flex:1}}>
              <View style={{margin: 10, flexDirection: 'row'}}>
                <View style={{flex: 2,}}>
                  <Text numberOfLines={1} style={{fontWeight: '600', color: 'white', fontSize: 20}}>{props.name}</Text>
                  <Text style={{fontSize: 12, color: 'white', marginTop: 10,}}>
                    { isUsersOwnNFT(props.owner) ? 
                    "By You"
                      :
                    "By " + shortenAddress(props.owner)
                    }
                  </Text>
                </View>
                <View style={{flex: 1, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row'}}>
                  <Image source={require('../assets/images/Ethereum-Logo-PNG.png')} style={{height: 40, width: 40, tintColor: 'white'}}/>
                  <Text style={{fontWeight: '600', color: 'white', fontSize: 35, marginLeft: 3,}}>{props.price}</Text>
                </View>
              </View>
            </View>

        </ImageBackground>
      </TouchableOpacity>
    )
      
  }

  const renderItem = ({ item }) => {
    return(                
        <NFTCardView  
          imgSource={item.nft_metadata.ipfs_image_url}
          name={item.nft_metadata.image_name}
          owner={item.nft_metadata.current_owner_address}
          price={item.marketplace_metadata.listing_price}
          seller={item.nft_metadata.current_owner_address}
          navigation={() => navigation.navigate('NFTDetails', { nft_metadata: item.nft_metadata, marketplace_metadata: item.marketplace_metadata, wallet_address: walletAddress })}
        />
    )
  }

  return (
    <React.Fragment>
      <SafeAreaView/>
      <StatusBar style='dark'/>
        <FlatList 
          data={NFT}
          ListHeaderComponent={
              <Text style={{fontSize: 35, paddingLeft: 20, fontWeight: '800'}}>NFT Marketplace</Text>
          }
          ListHeaderComponentStyle={{height: 170, width: Dimensions.get('window').width, justifyContent: 'center'}}
          numColumns={1}
          renderItem={renderItem}
          contentContainerStyle={{
            // justifyContent: "center",
            alignItems: "center",
            paddingBottom: 10,
          }}
          />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  buttonStyle: {
    backgroundColor: "#3399FF",
    borderWidth: 0,
    color: "#FFFFFF",
    borderColor: "#3399FF",
    height: 40,
    alignItems: "center",
    borderRadius: 30,
    marginLeft: 35,
    marginRight: 35,
    marginTop: 20,
    marginBottom: 20,
  },
  buttonTextStyle: {
    color: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    fontWeight: "600",
  },
});
