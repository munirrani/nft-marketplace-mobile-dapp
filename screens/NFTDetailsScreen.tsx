import { useWalletConnect } from '@walletconnect/react-native-dapp';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Linking, Alert} from 'react-native';
import ReadMore from 'react-native-read-more-text';
import Button from '../components/Button';
import { INFURA_ID } from '@env';
import {AutoGrowingTextInput} from 'react-native-autogrow-textinput';
import { Text, View } from '../components/Themed';
import { RootStackScreenProps } from '../types';
import { BigNumber, Contract, providers, utils } from 'ethers';
import { JsonRpcSigner } from '@ethersproject/providers';
import StatusMessage from '../components/StatusMessage';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../db-config';
import {getStatusBarHeight} from "react-native-status-bar-height";
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function NFTDetailsScreen({ route, navigation }: RootStackScreenProps<'NFTDetails'>) {

  const { nft_metadata, marketplace_metadata, image_metadata, wallet_address, is_users_own_nft } = route.params;

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [connectWalletFromThisPage, setConnectWalletFromThisPage] = useState(false);

  const [isStartingTransaction, setIsStartingTransaction] = useState(false);
	const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [doneBuying, setDoneBuying] = useState(false)
  const [buyingTxHash, setBuyingTxHash] = useState("")

  const [priceInMyr, setPriceInMyr] = useState('')

  const walletConnector = useWalletConnect();

  var signer;
  var gasPrice;
  var walletAddress = wallet_address;

  const date = new Date(marketplace_metadata.listing_date.seconds * 1000)

  const connectWallet = useCallback(() => {
    return walletConnector.connect();
  }, [walletConnector]);

  const setupProvider = async() => {
    const provider = new WalletConnectProvider({
      infuraId: INFURA_ID,
      connector: walletConnector
    });
    
    provider.on("accountsChanged", (accounts: string[]) => {
      console.log(accounts);
    });
    
    provider.on("chainChanged", (chainId: number) => {
      console.log(chainId);
    });
    
    provider.on("disconnect", (code: number, reason: string) => {
      console.log(code, reason);
    });

    await provider.enable()

    const web3Provider = new providers.Web3Provider(provider);
    signer = web3Provider.getSigner();
    
    gasPrice = await web3Provider.getGasPrice()
  }

  const checkWalletConnection = async() => {
    const isConnected = walletConnector.connected
    setIsWalletConnected(isConnected)
    if (isConnected) walletAddress = walletConnector.accounts[0]
  }

  useEffect(() => {
    checkWalletConnection()
  }, [isWalletConnected, connectWalletFromThisPage])

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      
      const checkConnection = async () => {
        try {
          if (isActive) {
            await checkWalletConnection()
          }
        } catch (e) {
        }
      };
      checkConnection();

      const getPrice = async() => 
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=myr")
      .then(res => res.json())
      .then(data => {
        setPriceInMyr(
          (parseFloat(data.ethereum.myr) * parseFloat(marketplace_metadata.listing_price)).toFixed(2)
        )
      })
    
      getPrice()
      return () => {
        isActive = false;
      };
    }, [isWalletConnected, connectWalletFromThisPage])
  );

  const buyNFT = async () => {
    console.log("Buying NFT tokenId" + nft_metadata.token_id)
    await setupProvider()
    try {
      const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
		  const estimatedGasLimit = await MarketPlaceContract.estimateGas.buyItem(NFTSmartContractAddress, nft_metadata.token_id, {
        value: utils.parseUnits(marketplace_metadata.listing_price, "ether")
      })
  
		  await MarketPlaceContract.buyItem(NFTSmartContractAddress, nft_metadata.token_id, {
			  gasPrice: gasPrice,
			  gasLimit: estimatedGasLimit,
        value: utils.parseUnits(marketplace_metadata.listing_price, "ether")
		  })
		  .then((tx:any) => { 
			  setIsSubmittingTransaction(true)
			  return tx.wait()
	    })
		  .then((result: any) => {
        console.log("Buying TX Result");
        console.log(result)
        setBuyingTxHash(result.events[0].transactionHash)
		  })

      console.log("Done buying. Now updating in Firebase...")
      setTimeout(async () => {
        setDoneBuying(true)
        await updateDoc(doc(db, "NFT", "NFT-"+ nft_metadata.token_id), {
          ["marketplace_metadata"]: {
            isListed: false,
            listing_date: {},
            listing_price: "",
            listing_transaction_hash: "",
            listing_views: 0,
          },
          ["nft_metadata.current_owner_address"]: walletAddress.toLowerCase(),
        })
      }, 1000);
    } catch (error) {
      setIsStartingTransaction(false)
      setIsSubmittingTransaction(false)
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  console.log(error)
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(
      address.length - 4,
      address.length
    )}`;
  }

  const _renderTruncatedFooter = (handlePress: any) =>
    <Text style={{color: "#4989ad", marginTop: 5}} onPress={handlePress}>
      Read more
    </Text>
    

  const _renderRevealedFooter = (handlePress: any) =>
    <Text style={{color: "#4989ad", marginTop: 5}} onPress={handlePress}>
      Show less
    </Text>

  const promptUser = (message: string, action: any) =>
    Alert.alert(
      "Confirmation",
      message, [{
        text: "Cancel",
        style: "cancel"
      }, { 
        text: "OK", onPress: action
      }
    ]
  );

  const Separator = () => 
  <View style={{marginTop: 10, width:Dimensions.get('window').width - 20, alignSelf:"center", backgroundColor:'#aaaaaa', opacity: .25, height:1,}} />

  return (<>
    <StatusBar style="light" />
    <ScrollView style={{backgroundColor: 'white'}}>
      <TouchableOpacity style={{left: 10, top: getStatusBarHeight() + 10, position: 'absolute', zIndex: 2}} onPress={() => navigation.pop()}>
        <Image
            source={require('../assets/images/back-icon.png')}
            style={{height: 20, width: 20, tintColor: 'white', shadowRadius: 4, shadowOpacity: .4, shadowColor: "#000000"}} 
        />
      </TouchableOpacity>
      <View style={{flex: 1, zIndex: 1}}>
        <Image 
          source={{uri: nft_metadata.ipfs_image_url}}
          style={{
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').width / (image_metadata.width / image_metadata.height),
          }}
        />
        <View style={{flex: 1, padding: 20}}>         
          <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center'}}>
            <Text style={{fontWeight: 'bold', fontSize: 25}}>{nft_metadata.image_name}</Text>
            <View style={{}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
                  <Image source={require('../assets/images/Ethereum-Logo-PNG.png')} style={{height: 30, width: 30, tintColor: '#555555'}}/>
                    <Text style={{fontWeight: 'bold', fontSize: 35, paddingLeft: 3,}}>{marketplace_metadata.listing_price}</Text>
                </View>
            </View>
          </View>
          <View style={{marginVertical:10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{color: '#555555'}}>
                    { is_users_own_nft ? 
                      "By You" 
                        : 
                      "By " + shortenAddress(nft_metadata.current_owner_address)}
              </Text>
              <Text style={{color: '#555555'}}>RM {priceInMyr}</Text>
          </View>
          <View style={{marginTop:10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{color: "#aaaaaa"}}>Listed on {date.getDate() + " " + monthNames[date.getMonth()] + " "  + date.getUTCFullYear()}</Text>
              <Text style={{color: "#aaaaaa"}}>{marketplace_metadata.listing_views} Views</Text>
          </View>
          <Separator />
          <Text style={{fontWeight: 'bold', marginVertical: 10}}>Description</Text>
          <ReadMore
              numberOfLines={3}
              renderTruncatedFooter={_renderTruncatedFooter}
              renderRevealedFooter={_renderRevealedFooter}>
              <Text>{nft_metadata.description}</Text>
          </ReadMore>
          <Text style={{fontWeight: 'bold', marginTop: 10}}>Dimensions</Text>
          <Text style={{marginTop: 10}}>{image_metadata.width} x {image_metadata.height}</Text>
          { !!nft_metadata.external_url && 
            <Text style={{fontWeight: 'bold', marginTop: 10}}>External URL</Text>
          }
          { !!nft_metadata.external_url && 
            <Text 
              style={{color: "#4989ad", marginTop: 10}} 
              onPress={() => Linking.openURL(nft_metadata.external_url)}>
              {nft_metadata.external_url}
            </Text>
          }
          <Text style={{fontWeight: 'bold', marginTop: 10}}>ID</Text>
          <Text style={{marginTop: 10}}>{nft_metadata.token_id}</Text>
          { !is_users_own_nft &&
              <Button 
                title={isWalletConnected ? "Buy" : "Connect wallet to buy"}
                style={{flexGrow: 1, backgroundColor: 'green', marginTop:20}}
                textStyle={{fontSize: 14, color: 'white'}}
                onPress={async() => {
                  if (isWalletConnected) {
                    promptUser("Confirm buy?", 
                      () => {
                        setIsStartingTransaction(true)
                        buyNFT()
                      }
                    )
                  } else {
                    await connectWallet() 
                    setConnectWalletFromThisPage(true)
                  }
                }}
              />
          }
          <View style={{flexGrow: 1, marginTop: 20}}>
            { isStartingTransaction && 
              <StatusMessage content="Starting..." />
            }
            { isSubmittingTransaction && 
              <StatusMessage content="Submitting transaction. Waiting for 1 confirmation..." />
            }
            { doneBuying && 
              <StatusMessage
                content="Photo bought!" 
                txHash={buyingTxHash}
              />
            }
          </View>
        </View>
      </View>
    </ScrollView>
  </>);
}

const styles = StyleSheet.create({
});
