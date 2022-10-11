import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import { StyleSheet, Image, Dimensions, Alert, AppState, Linking, PermissionsAndroid,} from 'react-native';

import { db } from '../db-config';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import { doc, Timestamp, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';

import { useWalletConnect } from '@walletconnect/react-native-dapp';

import { providers, utils, Contract } from "ethers";

import { BigNumber } from '@ethersproject/bignumber';
import WalletConnectProvider from '@walletconnect/web3-provider';
import {AutoGrowingTextInput} from 'react-native-autogrow-textinput';
import StatusMessage from '../components/StatusMessage';
import {AccordionList} from 'react-native-accordion-list-view';
import CapsuleTextBar from '../components/CapsuleTextBar';
import Button from '../components/Button';
import { INFURA_ID } from '@env';
import { useFocusEffect } from '@react-navigation/native';
import { Web3ContextProvider } from '../util/Web3ContextProvider';
import WalletLoginButton from '../components/WalletLoginButton';
import { downloadFileFromUri, openDownloadedFile } from 'expo-downloads-manager';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

export default function MyNFTScreen({ navigation }: RootTabScreenProps<'MyNFT'>) {

	const [NFT, setNFT] = useState([]);
	const [priceInEtherText, onChangePriceInEtherText] = useState<string>('');
	const [doneListing, setDoneListing] = useState(false);

	// Wallet
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [signer, setSigner] = useState(null)
	const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('')
	const [gasPrice, setGasPrice] = useState(null)
	const [isStartingTransaction, setIsStartingTransaction] = useState(false);
	const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

	// Status - Minted
	const [listingTxHash, setListingTxhash] = useState<string>('')
	
	// Status - Listed
	const [inPriceEditMode, setInPriceEditMode] = useState(false)
	const [changePriceText, setOnChangePriceText] = useState("")

	const [doneUpdateListing, setDoneUpdateListing] = useState(false)
	const [updateListingTxHash, setUpdateListingTxHash] = useState<string>('')
	
	const [doneCancelListing, setDoneCancelListing] = useState(false)
	const [cancelListingTxHash, setCancelListingTxHash] = useState<string>('')

	// Status - Sold
	const [isSalesAvailable, setIsSalesAvailable] = useState(false)
	const [doneWithdrawSales, setDoneWithdrawSales] = useState(false);
	
	const [withdrawSalesTxHash, setWithdrawSalesTxHash] = useState<string>('')
	
	const walletConnector = useWalletConnect();
	
	// TODO: METHOD TO REFRESH

	// TODO: WAY TO DISPLAY (NO NFT) TEXT WHEN THERE IS NO NFT CORRESPONDING TO USER
	
	const getAllInfo = async() => {
		const document = [];

		const q = query(collection(db, "NFT"),			
			where("nft_metadata.original_owner_address", "==", walletConnector.accounts[0].toLowerCase())
		)
		const querySnapshot = await getDocs(q);
		querySnapshot.forEach((doc) => {
			const data = doc.data()
			document.push(data)
		})

		const document2 = [];
		const q2 = query(collection(db, "NFT"), 
			where("nft_metadata.current_owner_address", "==", walletConnector.accounts[0].toLowerCase()),
		)
		const querySnapshot2 = await getDocs(q2);
		querySnapshot2.forEach((doc) => {
			const data = doc.data()
			document2.push(data)
		})

		const NFTs = new Set(document.map(d => d.nft_metadata.token_id))
		const arrayMerged = [...document, ...document2.filter(d => !NFTs.has(d.nft_metadata.token_id))]

		setNFT(arrayMerged);
	}
	
	const setup = async() => {	

		const provider = new WalletConnectProvider({
			infuraId: INFURA_ID,
			connector: walletConnector
		});

		const web3Provider = new providers.Web3Provider(provider);
		const signer = web3Provider.getSigner();
		setSigner(signer)
		
		provider.on("accountsChanged", async (accounts: string[]) => {
			console.log("accountsChanged listener")
			setIsWalletConnected(true)
			setCurrentWalletAddress(accounts[0])
		});
		
		provider.on("chainChanged", (chainId: number) => {
			console.log("Using chainId", chainId)
		});
		
		provider.on("disconnect", async (code: number, reason: string) => {
			console.log("disconnect listener")
			setCurrentWalletAddress("")
			setIsWalletConnected(false)
			setNFT([])
			console.log(code, reason);
		});
		await provider.enable()
		
		const gasPrice = await web3Provider.getGasPrice()
		setGasPrice(gasPrice)
	}

	const checkWalletStatus = async() => {	
		const isConnected = walletConnector.connected
		const account = walletConnector.accounts[0]
		setIsWalletConnected(isConnected)
		setCurrentWalletAddress(isConnected ? account : "")
		isConnected && await getAllInfo()
		!isConnected && setNFT([])
	}

	useEffect(() => {
		checkWalletStatus()

		navigation.setOptions({
			headerRight: () => (
				<WalletLoginButton customOnPress={()=> {
					if (isWalletConnected)  {
						console.log("Wallet connected, so disconnecting wallet")
						setNFT([])
						walletConnector.killSession()
						setIsWalletConnected(false)
					} else {
						console.log("Wallet unconnected, so connecting wallet")
						walletConnector.connect()
						setIsWalletConnected(true)
					}
				}} />
			)
		})
	  }, [navigation, isWalletConnected]);

	// }, [isWalletConnected, currentWalletAddress, isStartingTransaction, isSubmittingTransaction, doneListing, inPriceEditMode, 
	// 	doneUpdateListing, doneCancelListing, listingTxHash, updateListingTxHash, cancelListingTxHash, withdrawSalesTxHash])

	const listInMarketPlace = async(tokenId: number, gasPrice: BigNumber, signer: any) => {
		console.log("List in marketplace", "with tokenId", tokenId, "...")
  
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
		  const estimatedGasLimit = await MarketPlaceContract.estimateGas.listItem(NFTSmartContractAddress, tokenId, utils.parseUnits(priceInEtherText, 'ether'))
  
		  await MarketPlaceContract.listItem(NFTSmartContractAddress, tokenId, utils.parseUnits(priceInEtherText, 'ether'), {
			gasPrice: gasPrice,
			gasLimit: estimatedGasLimit
		  })
		  .then((tx:any) => { 
			setIsSubmittingTransaction(true)
			return tx.wait()
	    	})
		  .then((result: any) => {
			console.log("Marketplace Listing TX Result");
			console.log(result)
			// listingTxHash = result.events[0].transactionHash;
			setListingTxhash(result.events[0].transactionHash)
			setIsSubmittingTransaction(false)
			setDoneListing(true)
		  })

		  console.log("Done listing")
	  
		  setTimeout(async () => {
			console.log("Now updating in Firebase")
			await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
				["marketplace_metadata"]: {
					isListed: true,
					listing_date: Timestamp.now(),
					listing_price: priceInEtherText,
					listing_transaction_hash: listingTxHash,
				},
			})
			setIsStartingTransaction(false)
			setDoneListing(false)
		  }, 3000);
		} catch (error) {
			setIsStartingTransaction(false)
			setIsSubmittingTransaction(false)
			setDoneListing(false)
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  console.log(error)
		}
  
	}

	const cancelListing = async(tokenId: number) => {
		console.log("Cancelling listing tokenId" + tokenId)
		
		try {
			const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
			const estimatedGasLimit = await MarketPlaceContract.estimateGas.cancelListing(NFTSmartContractAddress, tokenId)
	
			await MarketPlaceContract.cancelListing(NFTSmartContractAddress, tokenId, {
			  gasPrice: gasPrice,
			  gasLimit: estimatedGasLimit
			})
			.then((tx:any) => { 
				setIsSubmittingTransaction(true)
				return tx.wait()
			})
			.then((result: any) => {
			  console.log("Cancel Listing TX Result");
			  console.log(result)
			  setCancelListingTxHash(result.events[0].transactionHash)
			//   cancelListingTxHash = result.events[0].transactionHash;
			  setIsSubmittingTransaction(false)
			  setDoneCancelListing(true)
			})
  
			console.log("Done cancel listing")

			// Give 3 seconds for user to verify on Etherscan before Firebase database updates the new state
			setTimeout(async () => {
				console.log("Now updating in Firebase")
				await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
					["marketplace_metadata"]: {
						isListed: false,
						listing_date: {},
						listing_price: "",
						listing_transaction_hash: "",
					},
				})
				setIsStartingTransaction(false)
				setDoneCancelListing(false)
			  }, 3000);
		
		} catch (error) {
			setIsStartingTransaction(false)
			setIsSubmittingTransaction(false)
			setDoneCancelListing(false)
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
			console.log(error)
		}
	}
	
	const updateListing = async(tokenId: number, price: string) => {
		console.log("Update listing with price " + price + " ETH")
		
		try {
			const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
			const estimatedGasLimit = await MarketPlaceContract.estimateGas.updateListing(NFTSmartContractAddress, tokenId, utils.parseUnits(price, 'ether'))
	
			await MarketPlaceContract.updateListing(NFTSmartContractAddress, tokenId, utils.parseUnits(price, 'ether'), {
			  gasPrice: gasPrice,
			  gasLimit: estimatedGasLimit
			})
			.then((tx:any) => { 
				setIsSubmittingTransaction(true)
				return tx.wait()
			})
			.then((result: any) => {
			  console.log("Update Listing TX Result");
			  console.log(result)
			  setUpdateListingTxHash(result.events[0].transactionHash)
			//   updateListingTxHash = result.events[0].transactionHash;
			  setIsSubmittingTransaction(false)
			  setDoneUpdateListing(true)
			})
  
			console.log("Done update listing")
			
			setTimeout(async () => {
				console.log("Now updating in Firebase")
				await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
					["marketplace_metadata"]: {
						isListed: true,
						listing_date: Timestamp.now(),
						listing_price: price,
						listing_transaction_hash: updateListingTxHash,
					},
				})
				setIsStartingTransaction(false)
				setDoneUpdateListing(false)
				setInPriceEditMode(false) // close edit mode
			}, 3000);
		
		} catch (error) {
			setIsStartingTransaction(false)
			setIsSubmittingTransaction(false)
			setDoneUpdateListing(false)
			setInPriceEditMode(false)
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
			console.log(error)
		}
	}

	const getProceeds = async() => {
		console.log("Checking withdraw availability")
		
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
		  const call = await MarketPlaceContract.getProceeds(currentWalletAddress)
		  const isAvailable = call.toString() != "0"
		  setIsSalesAvailable(isAvailable)
		  if (isAvailable) {
			const message = "There are " + utils.formatEther(call.toString()) + " ETH available to be withdrawn! Tap on \"Withdraw sales\" to withdraw"
			console.log(message)
		  	Alert.alert("Information", message,
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  } else {
			setIsSalesAvailable(false)
			const message = "It is already withdrawn"
			console.log(message)
			Alert.alert("", message,
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  }
		  
		} catch (error) {
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  console.log(error)
		}
	}

	const withdrawSales = async(tokenId: number) => {
		console.log("Withdraw sales with tokenId", tokenId, "...")
		
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
		  const estimatedGasLimit = await MarketPlaceContract.estimateGas.withdrawProceeds()
  
		  await MarketPlaceContract.withdrawProceeds({
			gasPrice: gasPrice,
			gasLimit: estimatedGasLimit
		  })
		  .then((tx:any) => { 
			setIsSubmittingTransaction(true)
			return tx.wait()
		  })
		  .then((result: any) => {
			console.log("Sales TX Result");
			console.log(result)
			setWithdrawSalesTxHash(result.transactionHash)
			// withdrawSalesTxHash = result.events[0].transactionHash;
			setIsSubmittingTransaction(false)
			setDoneWithdrawSales(true)
		  })
		} catch (error) {
			setIsStartingTransaction(false)
			setIsSubmittingTransaction(false)
			setDoneWithdrawSales(false)
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  console.log(error)
		}
	}

	/*
	*
	*
		REACT COMPONENT STUFF
	*
	*	
	*/

	const AddressText = (props: any) => {
		const isUsersAddress = currentWalletAddress.toLowerCase() === props.text.toLowerCase()
		return (
			<View style={[{flexDirection: 'row'}, props.style]}>
				{ isUsersAddress &&
					<Image 
						source={require('../assets/images/circle_green_checkmark.png')} 
						style={{
							width: 15,
							height: 15,
							marginRight: 5,
							marginTop: 2,
						}}
					/>
				}
				<View style={{flex:1}}>
					<Text style={[{},props.textStyle]}>{props.text}</Text>
				</View>
			</View>
		)
	}

	const MintedComponent = ({item}) => 
		<View>
			<View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
				<Image 
					source={require('../assets/images/Ethereum-Logo-PNG.png')} 
					style={{
						width: 30,
						height: 30,
						marginRight: 10,
					}}
				/>
				<AutoGrowingTextInput 
					onChangeText={onChangePriceInEtherText}
					value={priceInEtherText}
					style={{
						fontSize: 14,
						borderWidth: 1,
						borderRadius: 5,
						borderColor: "#DDDDDD",
						padding: 10,
						flex: 5,
					}}
					placeholder="Price in Ether"
					multiline={false}
				/>
				<Button 
					title={"Sell"}
					style={{flex: 2, marginLeft: 10, padding: 7, backgroundColor: 'green'}}
					textStyle={{fontSize: 12, color: 'white'}}
					onPress={() => {
						setIsStartingTransaction(true)
						listInMarketPlace(item.nft_metadata.token_id, gasPrice, signer)
					}}
				/>
			</View>
			<View>
				{ isStartingTransaction && 
					<StatusMessage 
						content="Starting..." 
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
				{ isSubmittingTransaction &&
					<StatusMessage
						content="Submitting transaction. Waiting for 1 confirmation..." 
						textStyle={{fontSize: 12}}
					/>
				}
				{ doneListing &&
					<StatusMessage
						content="Listed into Marketplace" 
						txHash={listingTxHash}
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
			</View>
		</View>
	
	const ListingPriceComponent = (item: any) => 
		<View>
			<Text style={{fontWeight: 'bold', marginTop: 10,}}>Price</Text>
			<View style={{alignItems: 'center', marginTop:10, flexDirection: 'row'}}>
				<Image 
					source={require('../assets/images/Ethereum-Logo-PNG.png')} 
					style={{
						width: 20,
						height: 20,
						marginRight: 5,
					}}
				/>
				{
					inPriceEditMode ? 
					<AutoGrowingTextInput 
						onChangeText={setOnChangePriceText}
						value={changePriceText}
						style={{
							fontSize: 14,
							borderWidth: 1,
							borderRadius: 5,
							padding: 10,
							borderColor: "#DDDDDD",
						}}
						placeholder="Enter new price"
						multiline={false}
					/>
						:
					<Text style={{fontSize: 14}}>{item.marketplace_metadata.listing_price} ETH</Text>
				}
			</View>
		</View>

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
	/* 
	Options: 
	1. Show price in first part of expandable card ✅
	2. Edit price (text input appears at the same spot as price text)
			-> Two buttons at the bottom change text (cancel & confirm) ✅
	3. Cancel listing (alert for confirmation) ✅
	4. StatusMessage at the bottom showing transaction status. ✅
	5. Update to firebase ✅
	
	Put two buttons side-to-side (update price & cancel) at the bottom
	*/
	const ListingEditComponent = (item: any) => 
		<View>
			<View style={{marginTop: 10, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
				<Button 
					title={inPriceEditMode ? "Close" : "Edit Price"}
					style={{flex: 1, marginRight: 10, backgroundColor: inPriceEditMode ? 'white' : 'green'}}
					textStyle={{fontSize: 12, color: inPriceEditMode ? "black" : 'white'}}
					onPress={() => {
						if (!inPriceEditMode) { 
							setInPriceEditMode(true)
							setOnChangePriceText(item.marketplace_metadata.listing_price)
						} else {
							setInPriceEditMode(false)
							// TODO A METHOD TO CLEAR SCREEN AFTER TX SETTLES
							setIsStartingTransaction(false)
							setIsSubmittingTransaction(false)
							setDoneUpdateListing(false)
						}
					}}
					/>
				<Button 
					title={inPriceEditMode ? "Confirm Price" : "Cancel Listing"}
					style={{flex: 1, marginLeft: 10, backgroundColor: inPriceEditMode ? 'green' : '#b50202'}}
					textStyle={{fontSize: 12, color: 'white'}}
					onPress={() => {
						if (!inPriceEditMode) { 
							// Cancel listing
							promptUser("Are you sure you want to cancel listing?", 
								() => {
									setIsStartingTransaction(true)
									cancelListing(item.nft_metadata.token_id)
								}
							)
						} else {
							// Confirm price
							if (changePriceText == item.marketplace_metadata.listing_price) {
								console.log("Woi harga sama")
							} else {
								promptUser(changePriceText + " ETH" + "\n\nConfirm price?", 
									() => {
										setIsStartingTransaction(true)
										updateListing(item.nft_metadata.token_id, changePriceText)
									}
								)
							}
						}
					}}
					/>
			</View>
			<View style={{marginTop: 10}}>
				{ isStartingTransaction &&
					<StatusMessage
						content="Starting..." 
						textStyle={{fontSize: 12}}
					/>
				}
				{ isSubmittingTransaction &&
					<StatusMessage
						content="Submitting transaction. Waiting for 1 confirmation..." 
						textStyle={{fontSize: 12}}
					/>
				}
				{ doneUpdateListing &&
					<StatusMessage
						content={"Done updating price"}
						txHash={updateListingTxHash}
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
				{ doneCancelListing &&
					<StatusMessage
						content={"Done cancel listing"}
						txHash={cancelListingTxHash}
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
			</View>
		</View>

	/* 
		Add text at the last part to show transaction history in Etherscan
		1. Button to check rewards (proceeds function in smart contract)
		2. If ada, collect proceeds. Change button color, text & onPress with green checkbox to receive
	*/
	const SoldComponent = (item) => 
		<View>
			<View style={{justifyContent: 'space-between', alignItems: 'stretch'}}>
				<Text style={{marginTop: 20, marginBottom: 15, alignSelf: 'center', color: "#4989ad"}}
					onPress={() => Linking.openURL("https://goerli.etherscan.io/token/" + NFTSmartContractAddress + "?a=" + item.nft_metadata.token_id)}>
					View exchange history in Etherscan
				</Text>
				<Button 
					title={"Check withdraw availability"}
					style={{marginTop: 10, flex: 2, backgroundColor: "#333333"}}
					textStyle={{fontSize: 12, color: 'white'}}
					onPress={() => {
						getProceeds()
					}}
				/>
				{
				isSalesAvailable &&
					<Button 
						title={"Withdraw sales"}
						style={{flex: 2, marginTop:10, backgroundColor: "green"}}
						textStyle={{fontSize: 12, color: 'white'}}
						onPress={() => {
							setIsStartingTransaction(true)
							withdrawSales(item.nft_metadata.token_id)
						}}
					/>
				}
			</View>
			<View style={{marginTop: 10}}>
				{ isStartingTransaction &&
					<StatusMessage
						content="Starting..." 
						textStyle={{fontSize: 12}}
					/>
				}
				{ isSubmittingTransaction &&
					<StatusMessage
						content="Submitting transaction. Waiting for 1 confirmation..." 
						textStyle={{fontSize: 12}}
					/>
				}
				{ doneWithdrawSales &&
					<StatusMessage
						content={"Done withdrawing"}
						txHash={withdrawSalesTxHash}
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
			</View>
		</View>

	const downloadAndOpenFile = async(uri: string, fileName: string) => {
		const { status, error } = await downloadFileFromUri(
			uri,
			fileName + ".jpg",		
		);
		await openDownloadedFile(fileName + ".jpg")
		console.log("status", status, error)
	}

	const BoughtComponent = ({item}) =>
		<View style={{width: '100%', marginTop: 10, alignItems: 'center', justifyContent: 'center'}}>
			<Button 
				title={"Download image from IPFS"}
				style={{width: '100%', backgroundColor: 'green'}}
				textStyle={{color: 'white'}}
				onPress={() => downloadAndOpenFile(item.nft_metadata.ipfs_image_url, item.nft_metadata.image_name)}
			/>
			<View style={{marginTop: 20, marginBottom: 10}}>
				<Text style={{color: "#4989ad"}}
					onPress={() => Linking.openURL("https://goerli.etherscan.io/token/" + NFTSmartContractAddress + "?a=" + item.nft_metadata.token_id)}>
					View exchange history in Etherscan
				</Text>
			</View>
		</View>

	const capsuleTextBarStyles = {
		minted: {
			text: "Minted",
			capsuleStyle: {backgroundColor: "#def0ff", borderColor: "#7ea2bf"},
			textStyle: {color: '#3b6687'},
		},
		listed: {
			text: "Listed",
			capsuleStyle:{backgroundColor: "#fff1e0", borderColor: "#bda17d"},
			textStyle: {color: '#87663b'},
		},
		bought: {
			text: "Bought",
			capsuleStyle:{backgroundColor: "#deffdf", borderColor: "#78b37c"},
			textStyle: {color: '#38803a'}
		},
		sold: {
			text: "Sold",
			capsuleStyle:{backgroundColor: "#ffdee6", borderColor: "#bd7d8c"},
			textStyle: {color: '#873b4d'}
		},
		loading: {
			text: "Loading...",
			capsuleStyle:{backgroundColor: "#ededed", borderColor: "#bfbdbe"},
			textStyle: {color: '#858585'},
		}
	}

	const getStatus = (item: any) => {
		const marketplace = item.marketplace_metadata
		const nft = item.nft_metadata
		if (marketplace.isListed) { // if is listed
				return 'listed'
		} else { // if not listed
			if (nft.original_owner_address.toLowerCase() == nft.current_owner_address.toLowerCase()) { // Owner is same as minter
				return 'minted'
			} else { // Owner and current owner are different, exchange have took place
				if(nft.current_owner_address.toLowerCase() != currentWalletAddress.toLowerCase()) 
					return 'sold'
				else
					return 'bought'
			}
		}
	}

	const cardMainBody = (item: any) => {

		const mintedTime = new Date(item.nft_metadata.minted_date.seconds * 1000)
		return (
			<View style={{flex:1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
				<Image 
					source={{uri: item.nft_metadata.ipfs_image_url}}
					style={{
						flex:2, height: 75, resizeMode:'cover',
					}}
				/>
				<View style={{height: 75, flex:4, marginHorizontal: 10}}>
					<View style={{flex:1, justifyContent:'center'}}>
						<Text style={{fontWeight: 'bold', fontSize: 14,}}>{item.nft_metadata.image_name}</Text>
						<Text style={{fontSize:10, position: 'absolute', bottom: 0, color: '#aaaaaa'}}>{mintedTime.toLocaleString()}</Text>
					</View>
				</View>
				<View style={{flex: 2, alignItems: "flex-end"}}>
					<CapsuleTextBar 
						text={capsuleTextBarStyles[getStatus(item)].text} 
						capsuleStyle={capsuleTextBarStyles[getStatus(item)].capsuleStyle}   
						textStyle={capsuleTextBarStyles[getStatus(item)].textStyle}
					/>
				</View>
			</View>
		)
	}

	const cardExpandedBody = (item: any) => {
		return (
			<View style={{margin:15}}>
				<View style={{width:Dimensions.get('window').width - 45, position:'absolute', alignSelf:"center", backgroundColor:'#aaaaaa', opacity: .25, height:1, zIndex: 5,}} />
				{ getStatus(item) == "listed" && ListingPriceComponent(item)}
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Image Description</Text>
				<Text style={{marginTop: 10, textAlign:'justify'}}>{item.nft_metadata.description}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Token ID</Text>
				<Text style={{marginTop: 10}}>{item.nft_metadata.token_id}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Current Owner</Text>
				<AddressText style={{marginTop: 10}} text={item.nft_metadata.current_owner_address} />
				{ nftSoldToSomeoneElse(item) && <>
					<Text style={{fontWeight: 'bold', marginTop: 10,}}>Original Owner</Text>
					<AddressText style={{marginTop: 10}} text={item.nft_metadata.original_owner_address} />
				</>
				}
				{ getStatus(item) == "bought" && <>
					<BoughtComponent item={item} />
					<MintedComponent item={item} />
				</>
				}
				{ getStatus(item) == "minted" &&
					<MintedComponent item={item} />
				}
				{ getStatus(item) == "listed" && ListingEditComponent(item) }
				{ getStatus(item) == "sold" && SoldComponent(item)}
			</View>
		)
	}

	const nftSoldToSomeoneElse = (url: any) => {
		return url.nft_metadata.original_owner_address.toLowerCase() != url.nft_metadata.current_owner_address.toLowerCase()
	}

	return (<>
			{ !isWalletConnected && 
				<View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}>
					<Text style={{fontSize:21, color: '#BBBBBB', }}>Wallet not Connected</Text>
					<Text style={{marginTop: 10, fontSize: 14, color: "#82bee0"}} onPress={checkWalletStatus}>Refresh</Text>
				</View>
			}
			{ isWalletConnected && 
				<View style={{flex: 1, padding: 15}}>
					<AccordionList
						containerItemStyle = {{shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
						borderRadius: 6, borderWidth: 1.5, borderColor:'#eeeeee'
					}}
					data={NFT}
					customTitle={item => cardMainBody(item)}
					customBody={item => cardExpandedBody(item)}
					animationDuration={300}
					/>
				</View>
			}
			</>
	);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
