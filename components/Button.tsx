import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Button(props: any) {
  const { onPress, title = 'Save' } = props;
  return (
    <TouchableOpacity style={[styles.button, props.style]} onPress={onPress}>
        { props.extraComponent }
      <Text style={[styles.text, props.textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#eeeeee",
    backgroundColor: '#ffffff',
    flexDirection: 'row'
  },
  text: {
    fontSize: 12,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    color: 'black',
  },
});