import WalletConnectProvider from "@walletconnect/web3-provider";
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { providers } from "ethers";
import { JsonRpcSigner } from '@ethersproject/providers';
import {useState, createContext, useEffect, Dispatch, SetStateAction, ReactNode } from 'react';
import { Alert, Linking } from "react-native";

interface WalletContext {
  shouldRefresh: boolean;
  setShouldRefresh: Dispatch<SetStateAction<boolean>>;
  ethereumPriceInMyr: string;
  setEthereumPriceInMyr: Dispatch<SetStateAction<string>>;
  notifyUserTxComplete: (message: string, transactionHash: string) => void;
}

export const WalletContextDefaultValue: WalletContext = {
    shouldRefresh: false,
    setShouldRefresh: () => false,
    ethereumPriceInMyr: '',
    setEthereumPriceInMyr: () => '',
    notifyUserTxComplete: (message: string, transactionHash: string) => {}
  }

export const Web3Context = createContext<WalletContext>(WalletContextDefaultValue);

export const Web3ContextProvider = ({ children } : {children: ReactNode}) => {

    const [shouldRefresh, setShouldRefresh] = useState<boolean>(false)
    const [ethereumPriceInMyr, setEthereumPriceInMyr] = useState('')

    const notifyUserTxComplete = (message: string, transactionHash: string) =>
    Alert.alert("",
        message,
        [{
            text: "Verify in Etherscan",
            onPress: () => {
                setShouldRefresh(!shouldRefresh)
                Linking.openURL('https://goerli.etherscan.io/search?f=0&q=' + transactionHash)
            }
        }, {
            text: "OK",
            onPress: () => setShouldRefresh(!shouldRefresh)
        }],
    )

    return (
        <Web3Context.Provider 
            value={{
                shouldRefresh, setShouldRefresh, 
                ethereumPriceInMyr, setEthereumPriceInMyr,
                notifyUserTxComplete
            }}>
            { children }
        </Web3Context.Provider>
    )
}