import { useWalletConnect } from '@walletconnect/react-native-dapp';
import React, {useCallback } from 'react';
import { View, Image } from 'react-native'
import Button from './Button';

const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(
      address.length - 4,
      address.length
    )}`;
  }

const WalletLoginButton = (props: any) => {

    const connector = useWalletConnect();

    const connect = useCallback(() => {
        return connector.connect();
    }, [connector]);


    const disconnect = useCallback(() => {
        return connector.killSession();
    }, [connector]);

    return (
        <View style={{flexDirection: 'row', paddingRight: 10}}>
            <Button 
                onPress={connector.connected ? disconnect : connect}
                title={connector.connected ? shortenAddress(connector.accounts[0]) : "CONNECT WALLET"}   
                extraComponent={connector.connected ? 
                <Image 
                    source={require('../assets/images/wallet-icon-greencheck.png')} 
                    style={{
                        width: 15,
                        height: 15,
                        marginRight: 5
                    }}
                /> : <></>}
                textStyle={{
                    fontSize: 10
                }}
            />

        </View>
    )
}

export default WalletLoginButton