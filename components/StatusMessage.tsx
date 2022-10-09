import React from "react"
import { View, Image, Text, Linking } from 'react-native'

const StatusMessage = (props: any) => {

    return (
        <View style={{alignItems: 'center', marginTop: 15, flexDirection: 'row'}}>
            <Image 
                source={require('../assets/images/circle_grey_checkmark.png')} 
                style={[{
                    width: 15,
                    height: 15,
                    marginRight: 5,
                    opacity: .5,
                }, props.imageStyle]}
            />
            <Text style={[{fontStyle: 'italic', color: '#AAAAAA' }, props.textStyle]}>
                { props.content }
            </Text>
            { props.txHash && 
                <Text style={[{paddingLeft: 5, fontStyle: 'italic', color: '#82bee0'}, props.blueTextStyle]}
                    onPress={() => Linking.openURL('https://goerli.etherscan.io/search?f=0&q=' + props.txHash)}>
                        (Verify in Etherscan)
                </Text> 
            }
        </View>
    )
}

export default StatusMessage