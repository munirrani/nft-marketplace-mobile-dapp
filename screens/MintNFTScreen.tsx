import React, { useState, useEffect, useContext, } from 'react';
import { StyleSheet, Image, ScrollView, Alert, TouchableOpacity, ImageBackground, Text, SafeAreaView, Linking } from 'react-native';
import { View } from '../components/Themed';
import {AutoGrowingTextInput} from 'react-native-autogrow-textinput';
import Button from '../components/Button';
import { BigNumber, Contract, providers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import StatusMessage from '../components/StatusMessage';
import { INFURA_ID, NFTPORT_AUTH} from '@env';
import * as ImagePicker from 'expo-image-picker';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import WalletLoginButton from '../components/WalletLoginButton';
import { Web3Context } from '../util/Web3ContextProvider';

const NFTSmartContractAddress = "0xc9a253097212a55a66e5667e2f4ba4284e5890de"
const NFTSmartContractABI = require('../contracts/abi/PhotoToken.json')

export default function MintNFTScreen() {

	// Wallet
	const [isStartingTransaction, setIsStartingMinting] = useState(false);
	const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

    const [nameText, onChangeNameText] = useState<string>('');
    const [descriptionText, onChangeDescriptionText] = useState<string>('');
    const [externalURLText, onChangeExternalURLText] = useState<string>('');
    const [imageResponse, setImageResponse] = useState(null);

	const [doneUploadImage, setDoneUploadImage] = useState(false);
	const [doneUploadMetadata, setDoneUploadMetadata] = useState(false);

    const walletConnector = useWalletConnect();

	const { shouldRefresh, setShouldRefresh } = useContext(Web3Context)

	var ipfsImageURL;
	var ipfsMetadataURL;


	const handleImageSelection = async() => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			quality: 1,
		});
		
		if (!result.cancelled) {
			setImageResponse(result);
		}
	}

    const uploadImageToIPFS = async() => {
      console.log("Uploading image to IPFS...");
      const form = new FormData();

	  const filePathParts = imageResponse.uri.split("\/")
	  const fileName = filePathParts[filePathParts.length - 1]

      form.append("file", {
        uri: imageResponse.uri,
        type: fileName.includes(".jpg") ? "image/jpeg" : "image/png",
		name: fileName
      });
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
          Authorization: NFTPORT_AUTH
        }
      };
      options.body = form

	  try {
			const request = await fetch('https://api.nftport.xyz/v0/files', options)
			const data = await request.json()
			console.log(data)
			ipfsImageURL = data.ipfs_url
			setDoneUploadImage(true)
	  } catch (error) {
			setIsStartingMinting(false)
		Alert.alert("Error", error.toString(),
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
		console.error(error)
	  }
    }

    const uploadMetadataToIPFS = async() => {
      console.log("Uploading metadata to IPFS...");

      const metadata:any = {
        name: nameText,
        description: descriptionText,
        file_url: ipfsImageURL,
		custom_fields: {
			image_width: imageResponse.width,
			image_height: imageResponse.height
		},
      }
	  if (externalURLText) metadata.external_url = externalURLText;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: NFTPORT_AUTH
        },
        body: JSON.stringify(metadata)
      };

		try {
			const request = await fetch('https://api.nftport.xyz/v0/metadata', options)
			const data = await request.json()
			console.log(data)
			ipfsMetadataURL = data.metadata_uri
			setDoneUploadMetadata(true)
		} catch (error) {
			setIsStartingMinting(false)
			setDoneUploadImage(false)
			Alert.alert("Error", error.toString(),
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
			console.error(error)
		}
    }

	const notifyUserTxComplete = (message: string, transactionHash: string) =>
	Alert.alert("",
		message,
		[{
			text: "Verify in Etherscan",
			onPress: () => {
				clearScreen()
				setShouldRefresh(!shouldRefresh)
				Linking.openURL('https://goerli.etherscan.io/search?f=0&q=' + transactionHash)
			}
		}, {
			text: "OK",
			onPress: () => { 
				clearScreen()
				setShouldRefresh(!shouldRefresh)
			}
		}],
	)

    const mintNFT = async(gasPrice: BigNumber, signer: any) => {
      console.log("Minting...")
      try {
        const NFTContract = new Contract(NFTSmartContractAddress, NFTSmartContractABI, signer);
        const estimatedGasLimit = await NFTContract.estimateGas.mintNFT(decodeURI(encodeURI(ipfsMetadataURL)))
        
        await NFTContract.mintNFT(decodeURI(encodeURI(ipfsMetadataURL)), {
			gasPrice: gasPrice,
			gasLimit: estimatedGasLimit
        })
		.then((tx:any) => {
			setIsSubmittingTransaction(true)
			return tx.wait()
		})
        .then((result:any) => {
			console.log("Minting TX Result");
			console.log(result);
			notifyUserTxComplete("Picture minted", result.transactionHash)
        })
		
      } catch (error) {
		setIsStartingMinting(false)
		setDoneUploadImage(false)
		setDoneUploadMetadata(false)
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

	const doInputChecks = () => {
		function isValidURL(str: string) {
			var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
			'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
			'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
			'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
			'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
			'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
			return !!pattern.test(str);
		}

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
		if (!imageResponse) {
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

		if (!!externalURLText && !isValidURL(externalURLText)) {
			Alert.alert("Error", "In valid URL format",
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

    const startMinting = async() => {
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
		const signer = web3Provider.getSigner();

		const gasPrice = await web3Provider.getGasPrice()
			
		try {
			await uploadImageToIPFS()
			await uploadMetadataToIPFS()
			await mintNFT(gasPrice, signer)
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

	const clearScreen = () => {
		// If done minting, give option to clear screen
		setIsStartingMinting(false)
		setIsSubmittingTransaction(false)
		onChangeNameText('')
		onChangeDescriptionText('')
		onChangeExternalURLText('')
		setImageResponse(null)
		setDoneUploadImage(false)
		setDoneUploadMetadata(false)
	}

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

    return (
	<SafeAreaView style={{flex: 1, paddingTop: getStatusBarHeight()}}>
		<View style={{padding:15, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
			<Text style={{fontSize: 25, fontWeight: 'bold'}}>Mint Photo</Text>
			<WalletLoginButton />
		</View>
      <ScrollView style={{flex:1,backgroundColor: "#ffffff"}}>
        <View style={styles.container}>
          <View style={{ margin:10 }}>
            <View style={{alignItems: 'center'}}>
              {!!imageResponse ?
				<ImageBackground 
					source={{uri: imageResponse.uri}}
					style={{
						marginBottom: 15,
						height: 200,
						width: '100%',
						backgroundColor: "#f0f0f0"
					}}
					resizeMode="contain">
					<TouchableOpacity style={{ position: 'absolute', top: 3, right: 3}} onPress={() => setImageResponse(null)}>
						<Image 
							source={require('../assets/images/x-icon.png')} 
							style={{width: 25, height: 25, opacity: .4,}}
						/>
					</TouchableOpacity>
				</ImageBackground>
			  		:
				<View style={{height: 200, width: '100%', marginBottom: 15, alignItems: 'center', justifyContent: 'center'}}>
					<Text style={{fontSize: 20, color: "#bbbbbb"}}>No Image Selected</Text>
				</View>
			  }
              <Button 
			  	style={{width: '100%'}}
                onPress={handleImageSelection}
                title={"Upload Image"}
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
					enableScrollToCaret
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
			<Button 
			  	style={{marginVertical: 10, width: '100%', backgroundColor: 'green',}}
                onPress={() => {
					promptUser("Confirm mint?", () => {
						const inputCheck = doInputChecks()
						setIsStartingMinting(inputCheck)
						inputCheck && startMinting()
					})
				}}
                title={"Mint Picture"}
				textStyle={{color: 'white', fontWeight: 'bold'}}
              />
			<View style={{marginLeft: 10}}>
				{ isStartingTransaction && 
					<StatusMessage content="Starting..." />
				}
				{ doneUploadImage && 
					<StatusMessage content="Uploaded image to IPFS" />
				}
				{ doneUploadMetadata && 
					<StatusMessage content="Uploaded metadata to IPFS" />
				}
				{ isSubmittingTransaction && 
					<StatusMessage content="Submitting transaction. Waiting for 1 confirmation..." />
				}
			</View>
          </View>
        </View>
      </ScrollView>
	  </SafeAreaView>);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
