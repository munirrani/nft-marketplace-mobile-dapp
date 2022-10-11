import WalletConnectProvider from "@walletconnect/web3-provider";
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { providers } from "ethers";
import { JsonRpcSigner } from '@ethersproject/providers';
import {useState, createContext, useEffect } from 'react';

export interface WalletContext {
  NFT: Array<Object>;
}

export const Web3Context = createContext<WalletContext | undefined>(undefined);

export const Web3ContextProvider = ({ children }) => {

    const[NFT, setNFT] = useState([])

    // const[isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

    return (
        <Web3Context.Provider value={{NFT}}>
            { children }
        </Web3Context.Provider>
    )
}