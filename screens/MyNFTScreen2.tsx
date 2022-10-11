import React, { useEffect, useState, } from 'react';
import { StyleSheet, Image, Dimensions, Alert,} from 'react-native';

import { db } from '../db-config';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import { doc, Timestamp, updateDoc, getDocs, collection, query, where, DocumentData } from 'firebase/firestore';

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


const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const MarketplaceSmartContractAddress = '0x1DaEFC61Ef1d94ce351841Bde660F582D7c060Db'
const MarketplaceSmartContractABI = require('../contracts/abi/NFTMarketPlace.json')

interface NFTState { 
    NFT: any[];
    priceInEtherText: string;
    doneListing: boolean;
    isWalletConnected: boolean;
    signer: any;
    currentWalletAddress: string;
    gasPrice: any;
    isStartingTransaction: boolean;
    isSubmittingTransaction: boolean;
    listingTxHash: string;
    inPriceEditMode: boolean;
    priceText: string;
    doneUpdateListing: boolean;
    updateListingTxHash: string;
    doneCancelListing: boolean;
    cancelListingTxHash: string;
    isSalesAvailable: boolean;
    doneWithdrawSales: boolean;
    withdrawSalesTxHash: string;
}

class MyNFTScreen extends React.Component<{}, NFTState> {

    constructor(props: {}) {
        super(props)

        this.state = {
            NFT: [],
            priceInEtherText: "",
            doneListing: false,
            isWalletConnected: false,
            signer: null,
            currentWalletAddress: "",
            gasPrice: null,
            isStartingTransaction: false,
            isSubmittingTransaction: false,
            listingTxHash: "",
            inPriceEditMode: false,
            priceText: "",
            doneUpdateListing: false,
            updateListingTxHash: "",
            doneCancelListing: false,
            cancelListingTxHash: "",
            isSalesAvailable: false,
            doneWithdrawSales: false,
            withdrawSalesTxHash: "",
        };
        
        // TODO: METHOD TO REFRESH
    
        // TODO: WAY TO DISPLAY (NO NFT) TEXT WHEN THERE IS NO NFT CORRESPONDING TO USER

    }

    componentDidMount(): void {
        console.log("Component did mount")
        this.setup()
    }
	
	async getAllInfo(): Promise<void> {
		const document = [];

		const q = query(collection(db, "NFT"),			
			where("nft_metadata.original_owner_address", "==", this.state.currentWalletAddress.toLowerCase())
		)
		const querySnapshot = await getDocs(q);
		querySnapshot.forEach((doc) => {
			const data = doc.data()
			document.push(data)
		})

		const document2: DocumentData[] = [];
		const q2 = query(collection(db, "NFT"), 
			where("nft_metadata.current_owner_address", "==", this.state.currentWalletAddress.toLowerCase()),
		)
		const querySnapshot2 = await getDocs(q2);
		querySnapshot2.forEach((doc) => {
			const data = doc.data()
			document2.push(data)
		})

		const NFTs = new Set(document.map(d => d.nft_metadata.token_id))
		const arrayMerged = [...document, ...document2.filter(d => !NFTs.has(d.nft_metadata.token_id))]

		this.setState({NFT: arrayMerged});
	}

	
	async setup(): Promise<void> {	

        const walletConnector = useWalletConnect()

		const provider = new WalletConnectProvider({
			infuraId: INFURA_ID,
			connector: walletConnector,
		});
		await provider.enable()

		const web3Provider = new providers.Web3Provider(provider);
		const signer = web3Provider.getSigner();

		provider.on("connect", (accounts: string[]) => {
			console.log("accounts listener")
		});
		
		provider.on("accountsChanged", async (accounts: string[]) => {
			console.log("accountsChanged listener")
			console.log(accounts);
            this.setState({currentWalletAddress: accounts[0]})
		});
		
		provider.on("chainChanged", (chainId: number) => {
			console.log("chain changed listener")
			console.log(chainId);
		});
		
		provider.on("disconnect", async (code: number, reason: string) => {
			console.log("disconnect listener")
            this.setState({currentWalletAddress: ""})
			await provider.disconnect()
			// setIsWalletConnected(false)
			console.log(code, reason);
		});
		
		const gasPrice = await web3Provider.getGasPrice()

		const isConnected = walletConnector.connected
        this.setState({
            currentWalletAddress: walletConnector.accounts[0],
            gasPrice: gasPrice,
            isWalletConnected: isConnected,
            signer: signer,
        })
		isConnected && await this.getAllInfo()
	}

	async listInMarketPlace (tokenId: number, gasPrice: BigNumber, signer: any) {
		console.log("List in marketplace", "with tokenId", tokenId, "...")
  
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, signer);
		  const estimatedGasLimit = await MarketPlaceContract.estimateGas.listItem(NFTSmartContractAddress, tokenId, utils.parseUnits(this.state.priceInEtherText, 'ether'))
  
		  await MarketPlaceContract.listItem(NFTSmartContractAddress, tokenId, utils.parseUnits(this.state.priceInEtherText, 'ether'), {
			gasPrice: gasPrice,
			gasLimit: estimatedGasLimit
		  })
		  .then((tx:any) => { 
            this.setState({isSubmittingTransaction: true})
			return tx.wait()
	    	})
		  .then((result: any) => {
			console.log("Marketplace Listing TX Result");
			console.log(result)
            this.setState({
                listingTxHash: result.events[0].transactionHash, 
                isSubmittingTransaction: false,
                doneListing: true,
            })
		  })

		  console.log("Done listing")
	  
		  setTimeout(async () => {
			console.log("Now updating in Firebase")
			await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
				["marketplace_metadata"]: {
					isListed: true,
					listing_date: Timestamp.now(),
					listing_price: this.state.priceInEtherText,
					listing_transaction_hash: this.state.listingTxHash,
				},
			})
            this.setState({
                isStartingTransaction: false,
                doneListing: false
            })
		  }, 3000);
		} catch (error) {
            this.setState({
                isStartingTransaction: false,
                isSubmittingTransaction: false,
                doneListing: false
            })
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
		  console.log(error)
		}
  
	}

	async cancelListing (tokenId: number) {
		console.log("Cancelling listing tokenId" + tokenId)
		
		try {
			const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, this.state.signer);
			const estimatedGasLimit = await MarketPlaceContract.estimateGas.cancelListing(NFTSmartContractAddress, tokenId)
	
			await MarketPlaceContract.cancelListing(NFTSmartContractAddress, tokenId, {
			  gasPrice: this.state.gasPrice,
			  gasLimit: estimatedGasLimit
			})
			.then((tx:any) => { 
				this.setState({isSubmittingTransaction: true})
				return tx.wait()
			})
			.then((result: any) => {
			  console.log("Cancel Listing TX Result");
			  console.log(result)
              this.setState({
                cancelListingTxHash: result.events[0].transactionHash,
                isSubmittingTransaction: false,
                doneCancelListing: true
              })
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
                this.setState({isStartingTransaction: false, 
                    doneCancelListing: false
                })
			  }, 3000);
		
		} catch (error) {
            this.setState({
                isStartingTransaction: false, 
                isSubmittingTransaction: false, 
                doneCancelListing: false
            })
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
			console.log(error)
		}
	}
	
	async updateListing (tokenId: number, price: string) {
		console.log("Update listing with price " + price + " ETH")
		
		try {
			const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, this.state.signer);
			const estimatedGasLimit = await MarketPlaceContract.estimateGas.updateListing(NFTSmartContractAddress, tokenId, utils.parseUnits(price, 'ether'))
	
			await MarketPlaceContract.updateListing(NFTSmartContractAddress, tokenId, utils.parseUnits(price, 'ether'), {
			  gasPrice: this.state.gasPrice,
			  gasLimit: estimatedGasLimit
			})
			.then((tx:any) => { 
                this.setState({isSubmittingTransaction: true})
				return tx.wait()
			})
			.then((result: any) => {
			  console.log("Update Listing TX Result");
			  console.log(result)
              this.setState({
                updateListingTxHash: result.events[0].transactionHash,
                isSubmittingTransaction: false,
                doneUpdateListing: true
              })
			})
  
			console.log("Done update listing")
			
			setTimeout(async () => {
				console.log("Now updating in Firebase")
				await updateDoc(doc(db, "NFT", "NFT-"+ tokenId), {
					["marketplace_metadata"]: {
						isListed: true,
						listing_date: Timestamp.now(),
						listing_price: price,
						listing_transaction_hash: this.state.updateListingTxHash,
					},
				})
                this.setState({
                    isStartingTransaction: false,
                    doneUpdateListing: false,
                    inPriceEditMode: false,
                })
			}, 3000);
		
		} catch (error) {
            this.setState({
                isStartingTransaction: false,
                isSubmittingTransaction: false,
                doneUpdateListing: false,
                inPriceEditMode: false,
            })
			Alert.alert("Error", error.toString(),
			[
				{ text: "Ok", style: "default", },
			],
				{ cancelable: true, }
			);
			console.log(error)
		}
	}

	async getProceeds() {
		console.log("Checking withdraw availability")
		
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, this.state.signer);
		  const call = await MarketPlaceContract.getProceeds(this.state.currentWalletAddress)
		  const isAvailable = call.toString() != "0"
          this.setState({isSalesAvailable: isAvailable})
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
            this.setState({isSalesAvailable: false})
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

	async withdrawSales (tokenId: number) {
		console.log("Withdraw sales with tokenId", tokenId, "...")
		
		try {
		  const MarketPlaceContract = new Contract(MarketplaceSmartContractAddress, MarketplaceSmartContractABI, this.state.signer);
		  const estimatedGasLimit = await MarketPlaceContract.estimateGas.withdrawProceeds()
  
		  await MarketPlaceContract.withdrawProceeds({
			gasPrice: this.state.gasPrice,
			gasLimit: estimatedGasLimit
		  })
		  .then((tx:any) => { 
            this.setState({isSubmittingTransaction: true})
			return tx.wait()
		  })
		  .then((result: any) => {
			console.log("Sales TX Result");
			console.log(result)
            this.setState({
                withdrawSalesTxHash: result.transactionHash,
                isSubmittingTransaction: false,
                doneWithdrawSales: true,
            })
        })
        } catch (error) {
            this.setState({
                isStartingTransaction: false,
                isSubmittingTransaction: false,
                doneWithdrawSales: false,
            })
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

	AddressText (props: any) {
        return (
            <View style={[{flexDirection: 'row'}, props.style]}>
                {	this.state.currentWalletAddress.toLowerCase() === props.text.toLowerCase() &&
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

	MintedComponent({item}) {
        return (
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
                        onChangeText={(text: string) => this.setState({priceInEtherText: text})}
                        value={this.state.priceInEtherText}
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
                            this.setState({isStartingTransaction: true})
                            this.listInMarketPlace(item.nft_metadata.token_id, this.state.gasPrice, this.state.signer)
                        }}
                    />
                </View>
                <View>
                    { this.state.isStartingTransaction && 
                        <StatusMessage 
                            content="Starting..." 
                            textStyle={{fontSize: 12}}
                            blueTextStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.isSubmittingTransaction &&
                        <StatusMessage
                            content="Submitting transaction. Waiting for 1 confirmation..." 
                            textStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.doneListing &&
                        <StatusMessage
                            content="Listed into Marketplace" 
                            txHash={this.state.listingTxHash}
                            textStyle={{fontSize: 12}}
                            blueTextStyle={{fontSize: 12}}
                        />
                    }
                </View>
            </View>
        )
    }
	
	ListingPriceComponent (item: any) { 
        return (
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
                        this.state.inPriceEditMode ? 
                        <AutoGrowingTextInput 
                            onChangeText={(text: string) => this.setState({priceText: text})}
                            value={this.state.priceText}
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
        )
    }

    promptUser (message: string, action: any) {
		Alert.alert(
			"Confirmation",
			message, [{
				text: "Cancel",
				style: "cancel"
			}, { 
				text: "OK", onPress: action 
			}]
	    );
    }
	/* 
	Options: 
	1. Show price in first part of expandable card ✅
	2. Edit price (text input appears at the same spot as price text)
			-> Two buttons at the bottom change text (cancel & confirm) ✅
	3. Cancel listing (alert for confirmation) ✅
	4. StatusMessage at the bottom showing transaction status. ✅
	5. Update to firebase 🚧
	
	Put two buttons side-to-side (update price & cancel) at the bottom
	*/
	ListingEditComponent(item: any) { 
        return(
            <View>
                <View style={{marginTop: 10, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                    <Button 
                        title={this.state.inPriceEditMode ? "Close" : "Edit Price"}
                        style={{flex: 1, marginRight: 10, backgroundColor: this.state.inPriceEditMode ? 'white' : 'green'}}
                        textStyle={{fontSize: 12, color: this.state.inPriceEditMode ? "black" : 'white'}}
                        onPress={() => {
                            if (!this.state.inPriceEditMode) { 
                                this.setState({
                                    inPriceEditMode: true,
                                    priceInEtherText: item.marketplace_metadata.listing_price 
                                })
                            } else {
                                this.setState({
                                    inPriceEditMode: false,
                                    isStartingTransaction: false,
                                    isSubmittingTransaction: false,
                                    doneUpdateListing: false,
                                })
                                // TODO A METHOD TO CLEAR SCREEN AFTER TX SETTLES
                            }
                        }}
                        />
                    <Button 
                        title={this.state.inPriceEditMode ? "Confirm Price" : "Cancel Listing"}
                        style={{flex: 1, marginLeft: 10, backgroundColor: this.state.inPriceEditMode ? 'green' : '#b50202'}}
                        textStyle={{fontSize: 12, color: 'white'}}
                        onPress={() => {
                            if (!this.state.inPriceEditMode) { 
                                // Cancel listing
                                this.promptUser("Are you sure you want to cancel listing?", 
                                    () => {
                                        this.setState({isStartingTransaction: true})
                                        this.cancelListing(item.nft_metadata.token_id)
                                    }
                                )
                            } else {
                                // Confirm price
                                if (this.state.priceText == item.marketplace_metadata.listing_price) {
                                    console.log("Woi harga sama")
                                } else {
                                    this.promptUser(this.state.priceText + " ETH" + "\n\nConfirm price?", 
                                        () => {
                                            this.setState({isStartingTransaction: true})
                                            this.updateListing(item.nft_metadata.token_id, this.state.priceText)
                                        }
                                    )
                                }
                            }
                        }}
                        />
                </View>
                <View style={{marginTop: 10}}>
                    { this.state.isStartingTransaction &&
                        <StatusMessage
                            content="Starting..." 
                            textStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.isSubmittingTransaction &&
                        <StatusMessage
                            content="Submitting transaction. Waiting for 1 confirmation..." 
                            textStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.doneUpdateListing &&
                        <StatusMessage
                            content={"Done updating price"}
                            txHash={this.state.updateListingTxHash}
                            textStyle={{fontSize: 12}}
                            blueTextStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.doneCancelListing &&
                        <StatusMessage
                            content={"Done cancel listing"}
                            txHash={this.state.cancelListingTxHash}
                            textStyle={{fontSize: 12}}
                            blueTextStyle={{fontSize: 12}}
                        />
                    }
                </View>
            </View>
        )
    }

	/* 
		Add text at the last part to show transaction history in Etherscan
		1. Button to check rewards (proceeds function in smart contract)
		2. If ada, collect proceeds. Change button color, text & onPress with green checkbox to receive
	*/
	SoldComponent(item: any) {
        return(
            <View>
                <View style={{marginTop: 10, justifyContent: 'space-between', alignItems: 'stretch'}}>
                    <Button 
                        title={"Check withdraw availability"}
                        style={{flex: 2, backgroundColor: "#333333"}}
                        textStyle={{fontSize: 12, color: 'white'}}
                        onPress={() => {
                            this.getProceeds()
                        }}
                    />
                    {
                    this.state.isSalesAvailable &&
                        <Button 
                            title={"Withdraw sales"}
                            style={{flex: 2, marginTop:10, backgroundColor: "green"}}
                            textStyle={{fontSize: 12, color: 'white'}}
                            onPress={() => {
                                this.setState({isStartingTransaction: true})
                                this.withdrawSales(item.nft_metadata.token_id)
                            }}
                        />
                    }
                </View>
                <View style={{marginTop: 10}}>
                    { this.state.isStartingTransaction &&
                        <StatusMessage
                            content="Starting..." 
                            textStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.isSubmittingTransaction &&
                        <StatusMessage
                            content="Submitting transaction. Waiting for 1 confirmation..." 
                            textStyle={{fontSize: 12}}
                        />
                    }
                    { this.state.doneWithdrawSales &&
                        <StatusMessage
                            content={"Done withdrawing"}
                            txHash={this.state.withdrawSalesTxHash}
                            textStyle={{fontSize: 12}}
                            blueTextStyle={{fontSize: 12}}
                        />
                    }
                </View>
            </View>
        )
    }
	
	/* 
		TODO: Add text at the last part (before sell function row) to show transaction history in Etherscan
	*/
	BoughtComponent(item) { 
        return(
            <View>
                
            </View>
        )
    }

	capsuleTextBarStyles = {
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

	getStatus (item: any) {
		const marketplace = item.marketplace_metadata
		const nft = item.nft_metadata
		if (marketplace.isListed) { // if is listed
				return 'listed'
		} else { // if not listed
			if (nft.original_owner_address.toLowerCase() == nft.current_owner_address.toLowerCase()) { // Owner is same as minter
				return 'minted'
			} else { // Owner and current owner are different, exchange have took place
				if(nft.current_owner_address.toLowerCase() != this.state.currentWalletAddress.toLowerCase()) 
					return 'sold'
				else
					return 'bought'
			}
		}
	}

	cardMainBody(item: any) {

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
						text={this.capsuleTextBarStyles[this.getStatus(item)].text} 
						capsuleStyle={this.capsuleTextBarStyles[this.getStatus(item)].capsuleStyle}   
						textStyle={this.capsuleTextBarStyles[this.getStatus(item)].textStyle}
					/>
				</View>
			</View>
		)
	}

	cardExpandedBody (item: any) {
		return (
			<View style={{margin:15}}>
				<View style={{width:Dimensions.get('window').width - 45, position:'absolute', alignSelf:"center", backgroundColor:'#aaaaaa', opacity: .25, height:1, zIndex: 5,}} />
				{ this.getStatus(item) == "listed" && this.ListingPriceComponent(item)}
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Image Description</Text>
				<Text style={{marginTop: 10, textAlign:'justify'}}>{item.nft_metadata.description}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Token ID</Text>
				<Text style={{marginTop: 10}}>{item.nft_metadata.token_id}</Text>
				<Text style={{fontWeight: 'bold', marginTop: 10,}}>Current Owner</Text>
				<this.AddressText style={{marginTop: 10}} text={item.nft_metadata.current_owner_address} />
				{this.nftSoldToSomeoneElse(item) && <>
					<Text style={{fontWeight: 'bold', marginTop: 10,}}>Original Owner</Text>
					<this.AddressText style={{marginTop: 10}} text={item.nft_metadata.original_owner_address} />
				</>
				}
				{ (this.getStatus(item) == "minted" || this.getStatus(item) == 'bought') &&
					<this.MintedComponent item={item} />
				}
				{ this.getStatus(item) == "listed" && this.ListingEditComponent(item) }
				{ this.getStatus(item) == "sold" && this.SoldComponent(item)}
			</View>
		)
	}

	nftSoldToSomeoneElse (url: any) {
		return url.nft_metadata.original_owner_address.toLowerCase() != url.nft_metadata.current_owner_address.toLowerCase()
	}

    render() {
        return (<>
                { !this.state.isWalletConnected && 
                    <View style={{flex:1, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize:21, color: '#BBBBBB', }}>Wallet not Connected</Text>
                    </View>
                }
                { this.state.isWalletConnected && 
                    <View style={{flex: 1, padding: 15}}>
                        <AccordionList
                            containerItemStyle = {{shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: {height: 2,width:0},
                            borderRadius: 6, borderWidth: 1.5, borderColor:'#eeeeee'
                        }}
                        data={this.state.NFT}
                        customTitle={item => this.cardMainBody(item)}
                        customBody={item => this.cardExpandedBody(item)}
                        animationDuration={300}
                        />
                    </View>
                }
                </>
        );
    }
}

const styles = StyleSheet.create({
});

export default MyNFTScreen;