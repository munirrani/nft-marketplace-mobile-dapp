import { useWalletConnect } from '@walletconnect/react-native-dapp';
import React, {useCallback, useContext } from 'react';
import { View, Image } from 'react-native'
import Button from './Button';
import { INFURA_ID } from '@env';
import { Web3ContextProvider } from '../util/Web3ContextProvider';

const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(
      address.length - 4,
      address.length
    )}`;
  }

const WalletLoginButton = (props: any) => {

    const connector = useWalletConnect()

    const connect = useCallback(() => {
        console.log("Connecting wallet button pressed")
        return connector.connect();
    }, [connector]);

    const disconnect = useCallback(() => {
        console.log("Disconnecting wallet button pressed")
        return connector.killSession();
    }, [connector]);

    const isConnected = connector.connected
    return (
        <View style={{flexDirection: 'row'}}>
            <Button 
                onPress={ !!props.customOnPress ? props.customOnPress : isConnected ? disconnect : connect}
                title={isConnected ? shortenAddress(connector.accounts[0]) : "CONNECT WALLET"}   
                textStyle={{color: isConnected ? "black" : "white", fontSize: 10,}}
                style={{backgroundColor: isConnected ? "#ffffff" : '#008000'}}
                extraComponent={isConnected ? 
                <Image 
                    source={require('../assets/images/wallet-icon-greencheck.png')} 
                    style={{
                        width: 15,
                        height: 15,
                        marginRight: 5
                    }}
                /> : <></>}
            />

        </View>
    )
}

export default WalletLoginButton