import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import { StyleSheet, Image, Dimensions, Alert, Linking, TextInput} from 'react-native';

import { db } from '../db-config';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { providers, utils, Contract } from "ethers";
import WalletConnectProvider from '@walletconnect/web3-provider';
import StatusMessage from '../components/StatusMessage';
import {AccordionList} from 'react-native-accordion-list-view';
import CapsuleTextBar from '../components/CapsuleTextBar';
import Button from '../components/Button';
import { INFURA_ID } from '@env';
import { useFocusEffect } from '@react-navigation/native';
import WalletLoginButton from '../components/WalletLoginButton';
import { downloadFileFromUri, openDownloadedFile } from 'expo-downloads-manager';
import { SafeAreaView } from 'react-native-safe-area-context';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const NFTSmartContractABI = require('../contracts/abi/PhotoToken.json')
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

export default function MyNFTScreen({ navigation }: RootTabScreenProps<'MyNFT'>) {

	/* 
	Global States
	*/
	const [NFT, setNFT] = useState([]);
	
	// Wallet
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('')
	const [isLoading, setIsLoading] = useState(false)
	const [hasNFT, setHasNFT] = useState(false)
	
	const walletConnector = useWalletConnect();

	var signer;
	var gasPrice;
	
	const getAllInfo = async() => {
		setIsLoading(true)

		const document3 = []
		const q3 = query(collection(db, "NFT"), 
			where("nft_metadata.owner_history", "array-contains", currentWalletAddress.toLowerCase())
		)
		const querySnapshot3 = await getDocs(q3)
		querySnapshot3.forEach((doc) => {
			const data = doc.data()
			document3.push(data)
		})
		document3.length > 0 && setHasNFT(true)

		setNFT(document3)
		setIsLoading(false)
	}
	
	const providerSetup = async() => {	

		const provider = new WalletConnectProvider({
			infuraId: INFURA_ID,
			connector: walletConnector
		});
		provider.on("accountsChanged", async (accounts: string[]) => {
			console.log("accountsChanged listener")
		});
		
		provider.on("chainChanged", (chainId: number) => {
			console.log("Using chainId", chainId)
		});
		
		provider.on("disconnect", async (code: number, reason: string) => {
			console.log("disconnect listener")
			console.log(code, reason);
		});

		await provider.enable()

		const web3Provider = new providers.Web3Provider(provider);
		signer = web3Provider.getSigner();
		
		gasPrice = await web3Provider.getGasPrice()
	}

	const checkWalletAndFetchInfo = async() => {	
		const isConnected = walletConnector.connected
		const account = walletConnector.accounts[0]
		setIsWalletConnected(isConnected)
		setCurrentWalletAddress(isConnected ? account : "")
		if (isConnected)  {
			await getAllInfo()
		} else {
			setNFT([])
			setHasNFT(false)
		}
	}

	useFocusEffect(
		React.useCallback(() => {
		  let isActive = true;
		  
		  const fetchData = async () => {
			try {
			  if (isActive) {
				const isConnected = walletConnector.connected
				const account = walletConnector.accounts[0]
				setIsWalletConnected(isConnected)
				setCurrentWalletAddress(isConnected ? account : "")
				if (isConnected) {
					await getAllInfo()
				} else {
					setNFT([])
					setHasNFT(false)
				}
			  }
			} catch (e) {
			}
		  };
		  fetchData();
	  
		  return () => {
			isActive = false;
		  };
		}, [isWalletConnected])
	  );

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

	const MintedComponent = ({item}) => {

		const [priceInEtherText, onChangePriceInEtherText] = useState<string>('');

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)
		const [doneListing, setDoneListing] = useState(false)
		const [listingTxHash, setListingTxHash] = useState('')

		const listInMarketPlace = async() => {
			const tokenId = item.nft_metadata.token_id
			console.log("List in marketplace", "with tokenId", tokenId, "...")
			await providerSetup()
	  
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
				setListingTxHash(result.events[0].transactionHash)
				setDoneListing(true)
			  })
	
			  console.log("Done listing")
		  
			} catch (error) {
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
				setDoneListing(false)
				onChangePriceInEtherText("")
				Alert.alert("Error", error.toString(),
				[
					{ text: "Ok", style: "default", },
				],
					{ cancelable: true, }
				);
			  console.log(error)
			}
	  
		}

		return (
		<View>
			<View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>					
				<Image 
					source={require('../assets/images/Ethereum-Logo-PNG.png')} 
					style={{
						width: 30,
						height: 30,
						marginRight: 10,
						tintColor: '#555555'
					}}
					/>
				<TextInput 
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
						promptUser(priceInEtherText + " ETH" + "\n\nConfirm price?", 
						() => {
							setIsStartingTransaction(true)
							listInMarketPlace()
						}
						)
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
		</View>)
	}
	
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

	const ListingEditComponent = ({item}) => {

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)

		const [inPriceEditMode, setInPriceEditMode] = useState(false)
		const [listedChangePriceText, setListedChangePriceText] = useState<string>()

		const [doneUpdateListing, setDoneUpdateListing] = useState(false)
		const [updateListingTxHash, setUpdateListingTxHash] = useState<string>('')
		
		const [doneCancelListing, setDoneCancelListing] = useState(false)
		const [cancelListingTxHash, setCancelListingTxHash] = useState<string>('')

		const cancelListing = async() => {
			const tokenId = item.nft_metadata.token_id
			console.log("Cancelling listing tokenId" + tokenId)
			await providerSetup()
			
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
				  setDoneCancelListing(true)
				})
	  
				console.log("Done cancel listing")
			
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
		
		const updateListing = async(price: string) => {
			const tokenId = item.nft_metadata.token_id
			console.log("Update listing with price " + price + " ETH")
			await providerSetup()
			
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
				  setDoneUpdateListing(true)
				})
	  
				console.log("Done update listing")
				setInPriceEditMode(false) // close edit mode
			
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
		
		return(
		<View>
			<Text style={{fontWeight: 'bold', marginTop: 10,}}>Price</Text>
			<View style={{alignItems: 'center', marginTop:10, flexDirection: 'row'}}>
				<Image 
					source={require('../assets/images/Ethereum-Logo-PNG.png')} 
					style={{
						width: 20,
						height: 20,
						marginRight: 5,
						tintColor: '#555555'
					}}
				/>
				{
					inPriceEditMode ? 
					<TextInput 
						onChangeText={setListedChangePriceText}
						value={listedChangePriceText}
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
			<View style={{marginTop: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
				<Button 
					title={inPriceEditMode ? "Close" : "Edit Price"}
					style={{flex: 1, marginRight: 10, backgroundColor: inPriceEditMode ? 'white' : 'green'}}
					textStyle={{fontSize: 12, color: inPriceEditMode ? "black" : 'white'}}
					onPress={() => {
						if (!inPriceEditMode) { 
							setInPriceEditMode(true)
							setListedChangePriceText(item.marketplace_metadata.listing_price)
						} else {
							setInPriceEditMode(false)
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
									cancelListing()
								}
							)
						} else {
							// Confirm price
							if (listedChangePriceText == item.marketplace_metadata.listing_price) {
								console.log("Woi harga sama")
							} else {
								promptUser(listedChangePriceText + " ETH" + "\n\nConfirm price?", 
									() => {
										setIsStartingTransaction(true)
										updateListing(listedChangePriceText)
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
		)
	}

	const SoldComponent = ({item}) => {

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)

		// Status - Sold
		const [isSalesAvailable, setIsSalesAvailable] = useState(false)
		const [doneWithdrawSales, setDoneWithdrawSales] = useState(false);
		
		const [withdrawSalesTxHash, setWithdrawSalesTxHash] = useState<string>('')

		const getProceeds = async() => {
			console.log("Checking withdraw availability")
			await providerSetup()
			
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
			await providerSetup()
			
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
				setDoneWithdrawSales(true)
			  })
	
			  setTimeout(async () => {
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
				setDoneWithdrawSales(false)
			}, 3000);
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

		return(<View>
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
		</View>)
	}

	const downloadAndOpenFile = async(uri: string, fileName: string) => {
		const { status, error } = await downloadFileFromUri(
			uri,
			fileName + ".jpg",		
		);
		await openDownloadedFile(fileName + ".jpg")
		console.log("status", status, error)
	}

	const BoughtComponent = ({item}) => {

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)

		const [doneApproveTxHash, setDoneApproveTxHash] = useState<string>('')
		const [doneApprove, setDoneApprove] = useState(false);

		const approveNFTForResell = async(tokenId: number) => {
			console.log("Approving NFT for resell", tokenId, "...")
			await providerSetup()
			
			try {
			  const NFTSmartContract = new Contract(NFTSmartContractAddress, NFTSmartContractABI, signer);
			  const estimatedGasLimit = await NFTSmartContract.estimateGas.approve(MarketplaceSmartContractAddress, tokenId)
	  
			  await NFTSmartContract.approve(MarketplaceSmartContractAddress, tokenId, {
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
				setDoneApproveTxHash(result.transactionHash)
				setDoneApprove(true)
			  })
	
				setTimeout(async () => {
					setIsStartingTransaction(false)
					setIsSubmittingTransaction(false)
					setDoneApprove(false)
				}, 3000);

			} catch (error) {
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
				setDoneApprove(false)
				Alert.alert("Error", error.toString(),
				[
					{ text: "Ok", style: "default", },
				],
					{ cancelable: true, }
				);
			  console.log(error)
			}
		}

		return (
		<View style={{width: '100%', marginTop: 10, alignItems: 'center', justifyContent: 'center'}}>
			<View style={{marginTop: 10, marginBottom: 20}}>
				<Text style={{color: "#4989ad"}}
					onPress={() => Linking.openURL("https://goerli.etherscan.io/token/" + NFTSmartContractAddress + "?a=" + item.nft_metadata.token_id)}>
					View exchange history in Etherscan
				</Text>
			</View>
			<Button 
				title={"Download image from IPFS"}
				style={{marginTop: 10, width: '100%', backgroundColor: "#333333"}}
				textStyle={{color: 'white'}}
				onPress={() => downloadAndOpenFile(item.nft_metadata.ipfs_image_url, item.nft_metadata.image_name)}
			/>
			<Button 
				title={"Approve this marketplace for a resell"}
				style={{marginTop: 10, width: '100%', backgroundColor: "#333333"}}
				textStyle={{color: 'white'}}
				onPress={() => { 
					promptUser("Confirm approve for a resell in this marketplace?", 
						() => {
							setIsStartingTransaction(true)
							approveNFTForResell(item.nft_metadata.token_id)
						}
					)
				}}
				
			/>
			<View style={{marginBottom: 10}}>
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
				{ doneApprove &&
					<StatusMessage
						content={"Approved!"}
						txHash={doneApproveTxHash}
						textStyle={{fontSize: 12}}
						blueTextStyle={{fontSize: 12}}
					/>
				}
			</View>
		</View>)
	}

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
		const owner_history = item.nft_metadata.owner_history
		const latest_owner = owner_history[owner_history.length - 1]
		if (marketplace.isListed && latest_owner.toLowerCase() == currentWalletAddress.toLowerCase()) { // if is listed
				return 'listed'
		} else { // if not listed
			if (owner_history.length == 1) {
				return 'minted'
			} else { // array size > 1, exchange have taken place.
				if (latest_owner.toLowerCase() == currentWalletAddress.toLowerCase()) {
					return 'bought'
				} else {
					return 'sold'
				}
			}
		}
	}

	const CardMainBody = (item: any) => {

		const mintedTime = new Date(item.nft_metadata.minted_date.seconds * 1000)
		return (
			<View key={item.nft_metadata.token_id} style={{flex:1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
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

	const CardExpandedBody = (item: any) => {
		return (
			<View style={{margin:15}}>
				<View style={{width:Dimensions.get('window').width - 45, position:'absolute', alignSelf:"center", backgroundColor:'#aaaaaa', opacity: .25, height:1, zIndex: 5,}} />
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Description</Text>
				<Text style={{marginTop: 10, textAlign:'justify'}}>{item.nft_metadata.description}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10}}>Dimensions</Text>
          		<Text style={{marginTop: 10}}>{item.image_metadata.width} x {item.image_metadata.height}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>ID</Text>
				<Text style={{marginTop: 10}}>{item.nft_metadata.token_id}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Current Owner</Text>
				<AddressText style={{marginTop: 10}} text={getLatestOwner(item.nft_metadata.owner_history)} />
				{ nftSoldToSomeoneElse(item.nft_metadata.owner_history) && <>
					<Text style={{fontWeight: 'bold', marginTop: 10,}}>Original Owner</Text>
					<AddressText style={{marginTop: 10}} text={getOriginalOwner(item.nft_metadata.owner_history)} />
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
				{ getStatus(item) == "listed" && <ListingEditComponent item={item}/> }
				{ getStatus(item) == "sold" && <SoldComponent item={item} />}
			</View>
		)
	}

	const nftSoldToSomeoneElse = (owner_history: Array<String>) => {
		return owner_history.length > 1
	}

	const getLatestOwner = (owner_history: Array<String>) => {
		return owner_history[owner_history.length - 1]
	}

	const getOriginalOwner = (owner_history: Array<String>) => {
		return owner_history[0]
	}

	return (<>
			<SafeAreaView style={{backgroundColor: "#ffffff"}} />
			<View style={{padding:15, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
				<Text style={{fontSize: 25, fontWeight: 'bold'}}>My Photo</Text>
				<WalletLoginButton customOnPress={()=> {
					if (isWalletConnected)  {
						console.log("Wallet connected, so disconnecting wallet")
						walletConnector.killSession()
						setIsWalletConnected(false)
					} else {
						console.log("Wallet unconnected, so connecting wallet")
						walletConnector.connect()
					}
				}} />
        	</View>
			{ !isWalletConnected ?
				<View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}>
					<Text style={{fontSize:21, color: '#BBBBBB', }}>Wallet not Connected</Text>
					<Text style={{marginTop: 10, fontSize: 14, color: "#82bee0"}} onPress={checkWalletAndFetchInfo}>Refresh</Text>
				</View>
					:
				<View style={{flex: 1, padding: 15}}>
					{ isLoading ? 
						<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 21, color: '#BBBBBB'}}>Loading...</Text>
						</View>
							:
						hasNFT ?
							<AccordionList
								keyboardShouldPersistTaps="always"
								containerItemStyle = {{shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
									borderRadius: 6, borderWidth: 1.5, borderColor:'#eeeeee'
								}}
								data={NFT}
								customTitle={CardMainBody}
								customBody={CardExpandedBody}
								animationDuration={300}
							/>
								:
							<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 21, color: '#BBBBBB'}}>There are no NFT from you</Text>
								<Text onPress={()=> navigation.navigate("MintNFT")} style={{marginTop: 16, fontSize: 16, color: "#82bee0"}}>Mint now</Text>
								<Text onPress={()=> navigation.navigate("MarketPlace")} style={{marginTop: 16, fontSize: 16, color: "#82bee0"}}>Buy now</Text>
							</View>
					}
				</View>
			}
			</>
	);
}

const styles = StyleSheet.create({
});
