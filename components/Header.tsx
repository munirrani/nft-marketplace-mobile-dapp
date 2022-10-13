import React from "react"
import { View, Text } from 'react-native'
import WalletLoginButton from "./WalletLoginButton"

const Header = (props:any) => {

    return(
        <View style={{padding:15, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 25, fontWeight: 'bold'}}>{props.title}</Text>
            <WalletLoginButton />
        </View>
    )
}

export default Header