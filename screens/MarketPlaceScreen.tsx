import { FlatList, SafeAreaView, StyleSheet, TouchableOpacity, Image } from 'react-native';

import { db } from '../db-config';
import { getDocs, collection } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

export default function MarketPlaceScreen() {

  const [NFT, setNFTs] = useState([]);

  useEffect(() => {

    const getAllInfo = async() => {
      const querySnapshot = await getDocs(collection(db, "NFT"));
      const document = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        data.marketplace_metadata.isListed && document.push(data)
      })
      setNFTs(document);
    }
    getAllInfo()
  }, []);
  
  const print = () => {
    console.log(NFT);
  }

  const renderItem = ({item: nft}) => {
    return(                
        <Image
          source={{uri: nft.nft_metadata.ipfs_image_url}}
          style={{
            width: 150,
            height: 150,
            resizeMode: 'stretch',
            marginHorizontal: 20,
            marginVertical: 20,
          }}
         />
    )
}

  return (
    <React.Fragment>
      <SafeAreaView/>
      <StatusBar style='dark'/>
      <FlatList 
        data={NFT}
        numColumns={1}
        renderItem={renderItem}
        contentContainerStyle={{
          justifyContent: "space-between",
          alignItems: "center",
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
