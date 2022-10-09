import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Image, Dimensions, ScrollView, Alert } from 'react-native';
import { View } from '../components/Themed';
import { setDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../db-config';
import {AutoGrowingTextInput} from 'react-native-autogrow-textinput';
import Button from '../components/Button';
import * as DocumentPicker from 'expo-document-picker';
import { BigNumber, Contract, providers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import StatusMessage from '../components/StatusMessage';
import { INFURA_ID, NFTPORT_AUTH} from '@env';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const NFTSmartContractABI = require('../contracts/abi/PhotoToken.json')

const date = new Date()
const timestampDefault = Timestamp.fromDate(date)

const firebase_data = {
  "marketplace_metadata": {
    "isListed": false,
    "listing_date": timestampDefault,
	"listing_price": "0.0"
  },
  "nft_metadata": {
    "description": "",
    "image_name": "",
    "ipfs_image_url": "",
    "ipfs_metadata_uri": "",
    "minted_date": timestampDefault,
    "nft_address": NFTSmartContractAddress,
    "owner_address": "",
    "token_id": 0,
    "mint_transaction_hash": "",
    "listing_transaction_hash": "",
	"external_url": "",
  },
}

export default function MintNFTScreen() {

    const [nameText, onChangeNameText] = useState<string>('');
    const [descriptionText, onChangeDescriptionText] = useState<string>('');
    const [externalURLText, onChangeExternalURLText] = useState<string>('');
    const [fileResponse, setFileResponse] = useState([]);

    const [buttonPressed, setButtonPressed] = useState(false);
	const [doneUploadImage, setDoneUploadImage] = useState(false);
	const [doneUploadMetadata, setDoneUploadMetadata] = useState(false);
	const [doneMinting, setDoneMinting] = useState(false);

    const walletConnector = useWalletConnect();

	var ipfsImageURL;
	var ipfsMetadataURL;
	
	var tokenId;
	var mintTxHash;
	var blockNumber;
 
	useEffect(()=> {
	}, [doneUploadImage, doneUploadMetadata, doneMinting])

    const handleDocumentSelection = useCallback(async () => {
      try {
        const response = await DocumentPicker.getDocumentAsync({
          type: "image/*",
          multiple: false,
        });
        setFileResponse(response);
      } catch (err) {
        console.warn(err);
      }
    }, []);

    const uploadImageToIPFS = async() => {
      console.log("Uploading image to IPFS...");
      const form = new FormData();
      form.append("file", {
        uri: fileResponse.uri,
        type: "image/jpeg",
        name: fileResponse.name
      });
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
          Authorization: NFTPORT_AUTH
        }
      };
      options.body = form

      await fetch('https://api.nftport.xyz/v0/files', options)
        .then(response => response.json())
        .then(response => {
          console.log(response);
		  ipfsImageURL = response.ipfs_url;
		  setDoneUploadImage(true);
        })
        .catch(err => console.error(err));
    }

    const uploadMetadataToIPFS = async() => {
      console.log("Uploading metadata to IPFS...");

      const metadata:any = {
        name: nameText,
        description: descriptionText,
        file_url: ipfsImageURL,
      }
	  if (externalURLText) metadata.external_url = externalURLText;

      const options2 = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: NFTPORT_AUTH
        },
        body: JSON.stringify(metadata)
      };

      await fetch('https://api.nftport.xyz/v0/metadata', options2)
        .then(response => response.json())
        .then(response => {
          console.log(response);
		  ipfsMetadataURL = response.metadata_uri
		  setDoneUploadMetadata(true)
        })
        .catch(err => console.error(err));
    }

    const mintNFT = async(gasPrice: BigNumber, signer: any) => {
      console.log("Minting...")
      try {
        const NFTContract = new Contract(NFTSmartContractAddress, NFTSmartContractABI, signer);
        const estimatedGasLimit = await NFTContract.estimateGas.mintNFT(decodeURI(encodeURI(ipfsMetadataURL)))
        
        await NFTContract.mintNFT(decodeURI(encodeURI(ipfsMetadataURL)), {
          gasPrice: gasPrice,
          gasLimit: estimatedGasLimit
        })
		.then((tx:any) => tx.wait())
        .then((result:any) => {
          console.log("Minting TX Result");
		  console.log(result);
		  mintTxHash = result.transactionHash;
		  tokenId = parseInt(result.events[0].topics[3]);
		  blockNumber = result.blockNumber;
		  setDoneMinting(true)
        })
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

    const putMetadataToFirebase = async(web3provider: any) => {
      console.log("Done minting, now putting into Firebase...");
	  console.log("Getting block number timestamp...")
	  const request = await web3provider.getBlock(blockNumber);
	  const time = Timestamp.fromDate(new Date(request.timestamp * 1000));

      const firebase_data2:any = JSON.parse(JSON.stringify(firebase_data, null, 2));
      firebase_data2.nft_metadata = {
        image_name: nameText,
        description: descriptionText,
        ipfs_image_url: ipfsImageURL,
        ipfs_metadata_uri: ipfsMetadataURL,
        minted_date:  time,
        owner_address: walletConnector.accounts[0],
        token_id: tokenId,
        mint_transaction_hash: mintTxHash,
      }
	  if (externalURLText) firebase_data2.nft_metadata.external_url = externalURLText;

      await setDoc(doc(db, "NFT", "NFT-" + tokenId), firebase_data2)
    }

    const putMetadataToFirebase2 = async() => {
      console.log("Rebuilding database");

      const firebase_data2:any = JSON.parse(JSON.stringify(CONTENT[0], null, 2));

      await setDoc(doc(db, "NFT", "NFT-14"), firebase_data2)
    }

    const putMetadataToFirebase3 = async() => {
      console.log("Rebuilding database");

      const firebase_data2:any = JSON.parse(JSON.stringify(CONTENT[0], null, 2));

      await updateDoc(doc(db, "NFT", "NFT-14"), {
		["marketplace_metadata.listing_price"]: "",
	  })
    }

	const doChecks = () => {
		if (!walletConnector.connected) {
			Alert.alert("Error", "Wallet is not connected.",
			[
				{
					text: "Ok",
					style: "default",
				},
			],
			{
				cancelable: true,
			}
			);		
			return false
		} 
		if (fileResponse.type !== "success") {
			Alert.alert("Error","Image not uploaded",
			[
				{
					text: "Ok",
					style: "default",
				},
				],
				{
					cancelable: true,
				}
			);
			return false
		}

		if (!nameText || !descriptionText) {
			Alert.alert("Error", "Information required is not complete",
			[
				{
					text: "Ok",
					style: "default",
				},
				],
				{
					cancelable: true,
				}
			);
			return false
		}
		return true
	}

    const doIt = async() => {
      
		const provider = new WalletConnectProvider({
			infuraId: INFURA_ID,
			connector: walletConnector
		});
		await provider.enable()
		
		const web3Provider = new providers.Web3Provider(provider);
		const signer = web3Provider.getSigner();

		provider.on("accountsChanged", (accounts: string[]) => {
			console.log(accounts);
		});

		provider.on("chainChanged", (chainId: number) => {
			console.log(chainId);
		});

		provider.on("disconnect", (code: number, reason: string) => {
			console.log(code, reason);
		});

		const gasPrice = await web3Provider.getGasPrice()
			
		uploadImageToIPFS()
		.then(() => uploadMetadataToIPFS())
		.then(() => mintNFT(gasPrice, signer))
		.then(() => putMetadataToFirebase(web3Provider))
    }

	const callContractTest = async() => {
		const provider = new WalletConnectProvider({
			infuraId: INFURA_ID,
			connector: walletConnector
		});
		await provider.enable()
		
		const web3Provider = new providers.Web3Provider(provider);
		const signer = web3Provider.getSigner();

		provider.on("accountsChanged", (accounts: string[]) => {
			console.log(accounts);
		});

		provider.on("chainChanged", (chainId: number) => {
			console.log(chainId);
		});

		provider.on("disconnect", (code: number, reason: string) => {
			console.log(code, reason);
		});

		const NFTContract = new Contract(NFTSmartContractAddress, NFTSmartContractABI, signer);
		const call = await NFTContract.tokenURI(0)
		console.log(call)
	}

    // TODO: Do an "X" button to discard images and clear selection.

    return (
      <ScrollView style={{backgroundColor: "#ffffff"}}>
        <View style={styles.container}>
          <View style={{ margin:10 }}>
            <View style={{alignItems: 'center', marginVertical: 10}}>
              {fileResponse.type === "success" && (<Image 
                source={{uri: fileResponse.uri}}
                style={{
                  height: 200,
                  width: Dimensions.get('window').width - 30,
                  marginBottom: 15,
                }}
                resizeMode="contain"
              />)}
              <Button 
                  onPress={handleDocumentSelection}
                  title={"✨ Upload Image ✨"}
              />
            </View>
            <View>
				<AutoGrowingTextInput 
					onChangeText={onChangeNameText}
					value={nameText}
					style={{
					fontSize: 16,
					borderWidth: 1,
					borderRadius: 5,
					borderColor: "#DDDDDD",
					padding: 10,
					marginTop: 10
					}}
					placeholder="Name"
					multiline={false}
				/>

				<AutoGrowingTextInput 
					onChangeText={onChangeDescriptionText}
					value={descriptionText}
					style={{
					fontSize: 16,
					borderWidth: 1,
					borderRadius: 5,
					borderColor: "#DDDDDD",
					padding: 10,
					marginTop: 10
					}}
					placeholder="Description"
					multiline={true}
				/>

				<AutoGrowingTextInput 
					onChangeText={onChangeExternalURLText}
					value={externalURLText}
					style={{
						fontSize: 16,
						borderWidth: 1,
						borderRadius: 5,
						borderColor: "#DDDDDD",
						padding: 10,
						marginTop: 10
					}}
					placeholder="External URL (optional)"
					multiline={false}
				/>
            </View>
            <View style={{alignItems: 'center', marginVertical: 10}}>
              <Button 
                title="Mint it!"
                style={{
                  backgroundColor: "#62f062",
                }}
                // onPress={() => {
				// 	const check = doChecks()
				// 	setButtonPressed(check)
				// 	check && doIt()
				// }}
                onPress={() => {
					putMetadataToFirebase3()
				}}
              />
            </View>
			<View style={{marginLeft: 10}}>
				{ buttonPressed && 
					<StatusMessage content="Starting..." />
				}
				{ doneUploadImage && 
					<StatusMessage content="Uploaded image to IPFS" />
				}
				{ doneUploadMetadata && 
					<StatusMessage content="Uploaded metadata to IPFS" />
				}
				{ doneMinting && 
					<StatusMessage
						content="Minted into NFT" 
						txHash={mintTxHash}
					/>
				}
			</View>
          </View>
        </View>
      </ScrollView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
