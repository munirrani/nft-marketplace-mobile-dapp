import React, { useCallback, useContext, useEffect, useRef, useState, } from 'react';
import { StyleSheet, Image, Dimensions, Alert, Linking, TextInput, ScrollView, RefreshControl} from 'react-native';

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
import WalletLoginButton from '../components/WalletLoginButton';
import { downloadFileFromUri, openDownloadedFile } from 'expo-downloads-manager';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Web3Context } from '../util/Web3ContextProvider';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const NFTSmartContractABI = require('../contracts/abi/PhotoToken.json')
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MyNFTScreen({ navigation }: RootTabScreenProps<'MyNFT'>) {

	/* 
	Global States
	*/
	const [NFT, setNFT] = useState([]);
	
	// Wallet
	const [isLoading, setIsLoading] = useState(true)
	const [hasNFT, setHasNFT] = useState(false)
	const [refreshing, setRefreshing] = useState(false);

	const { shouldRefresh, ethereumPriceInMyr, setEthereumPriceInMyr, notifyUserTxComplete } = useContext(Web3Context)
	
	const walletConnector = useWalletConnect();

	var signer;
	var gasPrice;
	
	const getAllInfo = async() => {

		const document = []
		const q = query(collection(db, "NFT"), 
			where("nft_metadata.owner_history", "array-contains", walletConnector.accounts[0].toLowerCase())
		)
		const querySnapshot = await getDocs(q)
		querySnapshot.forEach((doc) => {
			const data = doc.data()
			document.push(data)
		})
		document.length > 0 && setHasNFT(true)
		
		setNFT(document)
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

	const getPrice = async() => 
	fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=myr")
	.then(res => res.json())
	.then(data => {
	  setEthereumPriceInMyr(data.ethereum.myr)
	})

	const setInfo = async() => {
		if (walletConnector.connected)  {
			await getAllInfo()
		} else {
			setNFT([])
			setHasNFT(false)
		}
	}

	useEffect(() => {
		setInfo()
		getPrice()
	}, [walletConnector, shouldRefresh])

	const wait = (timeout: number) => {
		return new Promise(resolve => setTimeout(resolve, timeout));
	}

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		setInfo()
		getPrice()
		wait(2000).then(() => setRefreshing(false));
	}, []);

	const promptUser = (message: string, action: any) =>
		Alert.alert(
			"Confirmation",
			message, [{
				text: "Cancel",
				style: "cancel"
			}, { 
				text: "OK", onPress: action 
			}]
		);

	/*
	*
	*
		REACT COMPONENT STUFF
	*
	*	
	*/

	const AddressText = (props: any) => {
		const isUsersAddress = walletConnector.accounts[0].toLowerCase() === props.text.toLowerCase()
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
				notifyUserTxComplete("Picture listed in Marketplace", result.events[0].transactionHash)
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
			  })
	
			  console.log("Done listing")
			} catch (error) {
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
				onChangePriceInEtherText("")
				const errorMessage = error.toString()
				if (errorMessage.includes("UNPREDICTABLE_GAS_LIMIT")) {
					Alert.alert("Error", "You need to approve this marketplace for a resell",
					[
						{ text: "Ok", style: "default", },
					],
						{ cancelable: true, }
					);
				} else {
					Alert.alert("Error", errorMessage,
					[
						{ text: "Ok", style: "default", },
					],
						{ cancelable: true, }
					);
				}
			  console.log(error)
			}
	  
		}

		return (
		<View>
			<View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10}}>					
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
						flex: 2,
					}}
					placeholder="Price in Ether"
					multiline={false}
				/>
				<Button 
					title={"Sell"}
					style={{flex: 1, marginLeft: 10, padding: 10, backgroundColor: 'green'}}
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
			{!!priceInEtherText && !isStartingTransaction &&
				<View style={{marginTop: 10}}>
					<Text style={{marginLeft: 40, color: "#bbbbbb", fontSize: 12,}}>= RM {(parseFloat(ethereumPriceInMyr) * parseFloat(priceInEtherText)).toFixed(2)}</Text>
				</View>
			}
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
			</View>
		</View>)
	}

	const ListingEditComponent = ({item}) => {

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)

		const [inPriceEditMode, setInPriceEditMode] = useState(false)
		const [listedChangePriceText, setListedChangePriceText] = useState<string>()

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
				  notifyUserTxComplete("Listing canceled", result.events[0].transactionHash)
				  setIsStartingTransaction(false)
				  setIsSubmittingTransaction(false)
				})
	  
				console.log("Done cancel listing")
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
				  notifyUserTxComplete("Price updated", result.events[0].transactionHash)
				  setIsStartingTransaction(false)
				  setIsSubmittingTransaction(false)
				})
	  
				console.log("Done update listing")
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
					isStartingTransaction ?
					<Text style={{fontSize: 14}}>{listedChangePriceText} ETH (Processing)</Text>
						:
					<Text style={{fontSize: 14}}>{item.marketplace_metadata.listing_price} ETH</Text>
				}
			</View>
			{!!listedChangePriceText && inPriceEditMode && 
				<View style={{marginTop: 10}}>
					<Text style={{marginLeft: 25, color: "#bbbbbb", fontSize: 12,}}>= RM {(parseFloat(ethereumPriceInMyr) * parseFloat(listedChangePriceText)).toFixed(2)}</Text>
				</View>
			}
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
										setInPriceEditMode(false)
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
			</View>
		</View>
		)
	}

	const SoldComponent = ({item}) => {

		const [isStartingTransaction, setIsStartingTransaction] = useState(false)
		const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)

		// Status - Sold
		const [isSalesAvailable, setIsSalesAvailable] = useState(false)

		const getProceeds = async() => {
			console.log("Checking withdraw availability")
			await providerSetup()
			
			try {
			  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
			  const call = await MarketPlaceContract.getProceeds(walletConnector.accounts[0])
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
				notifyUserTxComplete("Sales withdrawn", result.transactionHash)
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
			  })

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
				notifyUserTxComplete("Marketplace approved", result.transactionHash)
				setIsStartingTransaction(false)
				setIsSubmittingTransaction(false)
			  })

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
			<View style={{marginBottom: 10, justifyContent: 'flex-start'}}>
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
		if (marketplace.isListed && latest_owner.toLowerCase() == walletConnector.accounts[0].toLowerCase()) { // if is listed
				return 'listed'
		} else { // if not listed
			if (owner_history.length == 1) {
				return 'minted'
			} else { // array size > 1, exchange have taken place.
				if (latest_owner.toLowerCase() == walletConnector.accounts[0].toLowerCase()) {
					return 'bought'
				} else {
					return 'sold'
				}
			}
		}
	}

	const CardMainBody = (item: any) => {

		const mintedTime = new Date(item.nft_metadata.minted_date.seconds * 1000)

		const getAMPMTime = (date: Date) => {
			var hours = date.getHours()
			var minutes = date.getMinutes()
			if (minutes < 10) minutes = "0" + minutes
			const ampm = hours >= 12 ? "PM" : "AM"
			if(hours > 12) hours = hours - 12 
			return hours + ":" + minutes + " " + ampm
		  }

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
						<Text style={{fontSize:10, position: 'absolute', bottom: 0, color: '#aaaaaa'}}>
							{mintedTime.getDate()} {monthNames[mintedTime.getMonth()]} {mintedTime.getUTCFullYear()} {getAMPMTime(mintedTime)}
						</Text>
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
				<WalletLoginButton />
        	</View>
			{ !walletConnector.connected ?
				<View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}>
					<Text style={{fontSize:21, color: '#BBBBBB', }}>Wallet not Connected</Text>
				</View>
					:
				<ScrollView style={{flex: 1, padding: 15,}}
					refreshControl={
						<RefreshControl 
							refreshing={refreshing}
							onRefresh={onRefresh}
						/>
					}
				>
					{ isLoading ? 
						<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 21, color: '#BBBBBB'}}>Loading...</Text>
						</View>
							:
						hasNFT ?
							<AccordionList
								keyboardShouldPersistTaps="always"
								containerItemStyle = {{
									shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
									borderRadius: 6, borderWidth: 1.5, borderColor:'#eeeeee',
								}}
								data={NFT}
								customTitle={CardMainBody}
								customBody={CardExpandedBody}
								animationDuration={300}
							/>
								:
							<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
								<Text style={{fontSize: 21, color: '#BBBBBB'}}>There are no pictures</Text>
								<Text onPress={()=> navigation.navigate("MintNFT")} style={{marginTop: 16, fontSize: 16, color: "#82bee0"}}>Mint now</Text>
								<Text onPress={()=> navigation.navigate("MarketPlace")} style={{marginTop: 16, fontSize: 16, color: "#82bee0"}}>Buy now</Text>
							</View>
					}
				</ScrollView>
			}
			</>
	);
}

const styles = StyleSheet.create({
});
