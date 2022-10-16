import { useWalletConnect } from '@walletconnect/react-native-dapp';
import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Linking, Alert} from 'react-native';
import ReadMore from 'react-native-read-more-text';
import Button from '../components/Button';
import { INFURA_ID } from '@env';
import { Text, View } from '../components/Themed';
import { RootStackScreenProps } from '../types';
import { Contract, providers, utils } from 'ethers';
import StatusMessage from '../components/StatusMessage';
import {getStatusBarHeight} from "react-native-status-bar-height";
import { StatusBar } from 'expo-status-bar';
import { Web3Context } from '../util/Web3ContextProvider';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function NFTDetailsScreen({ route, navigation }: RootStackScreenProps<'NFTDetails'>) {

  const { nft_metadata, marketplace_metadata, image_metadata, ethereum_price } = route.params;

  const [isStartingTransaction, setIsStartingTransaction] = useState(false);
	const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [doneBuying, setDoneBuying] = useState(false)

  const walletConnector = useWalletConnect();

  const scrollRef = useRef()

  const { notifyUserTxComplete } = useContext(Web3Context)

  const connectWallet = useCallback(() => {
    return walletConnector.connect();
  }, [walletConnector]);

  const seller = nft_metadata.owner_history[nft_metadata.owner_history.length - 1]

  var signer;
  var gasPrice;

  const date = new Date(marketplace_metadata.listing_date.seconds * 1000)

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
        scrollRef.current.scrollToEnd({ animated: true })
			  return tx.wait()
	    })
		  .then((result: any) => {
        console.log("Buying TX Result");
        console.log(result)
        setDoneBuying(true)
        notifyUserTxComplete("Transaction completed", result.events[0].transactionHash)
		  })
      setIsStartingTransaction(false)
      setIsSubmittingTransaction(false)
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
    <StatusBar style="light" backgroundColor={'rgba(0,0,0,0.25)'} />
    <ScrollView ref={scrollRef} style={{backgroundColor: 'white'}}>
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
            <Text style={{flex: 5, fontWeight: 'bold', fontSize: 25}}>{nft_metadata.image_name}</Text>
            <View style={{flex: 2}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
                  <Image source={require('../assets/images/Ethereum-Logo-PNG.png')} style={{height: 25, width: 25, tintColor: '#555555'}}/>
                    <Text style={{fontWeight: 'bold', fontSize: 30, paddingLeft: 5,}}>{marketplace_metadata.listing_price}</Text>
                </View>
            </View>
          </View>
          <View style={{marginVertical:10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{color: '#555555'}}>
                    { walletConnector.connected && walletConnector.accounts[0].toLowerCase() == seller.toLowerCase() ? 
                      "By You" 
                        : 
                      "By " + shortenAddress(seller)}
              </Text>
              <Text style={{color: '#555555'}}>RM {(parseFloat(ethereum_price) * parseFloat(marketplace_metadata.listing_price)).toFixed(2)}</Text>
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
          { walletConnector.connected ?
              walletConnector.accounts[0].toLowerCase() != seller.toLowerCase() &&
              <Button 
                title={doneBuying ? "Bought" : "Buy"}
                style={{flexGrow: 1, backgroundColor: doneBuying ? '#dddddd' : 'green', marginTop:20}}
                textStyle={{fontSize: 14, color: 'white'}}
                onPress={() => {
                    promptUser("Confirm buy?", 
                      () => {
                        setIsStartingTransaction(true)
                        scrollRef.current.scrollToEnd({ animated: true })
                        buyNFT()
                      }
                    )
                }}
              />
                :
              <Button 
                title={"Connect wallet to buy"}
                style={{flexGrow: 1, backgroundColor: 'green', marginTop:20}}
                textStyle={{fontSize: 14, color: 'white'}}
                onPress={connectWallet}
              />
          }
          <View style={{flexGrow: 1, marginTop: 10}}>
            { isStartingTransaction && 
              <StatusMessage content="Starting..." />
            }
            { isSubmittingTransaction && 
              <StatusMessage content="Submitting transaction. Waiting for 1 confirmation..." />
            }
          </View>
        </View>
      </View>
    </ScrollView>
  </>);
}

const styles = StyleSheet.create({
});
