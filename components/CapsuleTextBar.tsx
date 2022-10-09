import React from 'react'
import { Text, View } from 'react-native'

const CapsuleTextBar = (props: any) => {
    return (
        <View style={[{
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 15,
            borderWidth: .5,
            paddingVertical:5,
            paddingHorizontal: 10,
        }, props.capsuleStyle]}>
            <Text style={[{fontSize: 10,}, props.textStyle]}>{props.text}</Text>
        </View>
    )
}

export default CapsuleTextBar