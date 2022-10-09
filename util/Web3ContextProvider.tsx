import WalletConnectProvider from "@walletconnect/web3-provider";
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { providers } from "ethers";
import { JsonRpcSigner } from '@ethersproject/providers';
import {useState, createContext, useEffect } from 'react';

export const Web3Context = createContext();

interface Signer {
  signer: JsonRpcSigner;
}

export const Web3ContextProvider = ({ children }) => {

    const[signer, setSigner] = useState<Signer>();
    const[account, setAccount] = useState<string>('');
    const[isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  
    const connector = useWalletConnect();

    useEffect(() => {
      // setIsWalletConnected(connector.connected)
      // connector.connected && setAccount(connector.accounts[0])

    }, [])

    return (
        <Web3Context.Provider value={{signer, account, isWalletConnected}}>
            { children }
        </Web3Context.Provider>
    )
}