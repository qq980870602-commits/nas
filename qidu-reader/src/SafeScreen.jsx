import React from 'react';
import {Platform, SafeAreaView as SystemSafeAreaView, StyleSheet, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView as AndroidSafeAreaView} from 'react-native-safe-area-context';

// Each native Modal has its own window, so measure its own insets too.
// Keep absolute controls in a separate content frame: padding on their
// positioning parent alone does not move bottom/left/right anchored children.
export default function SafeScreen({style, children, ...props}) {
  if (Platform.OS !== 'android') return <SystemSafeAreaView {...props} style={style}>{children}</SystemSafeAreaView>;
  const {backgroundColor} = StyleSheet.flatten(style) || {};
  return <SafeAreaProvider style={{flex:1, backgroundColor}}>
    <AndroidSafeAreaView edges={['top','right','bottom','left']} style={{flex:1, backgroundColor}}>
      <View {...props} style={[{flex:1},style]}>{children}</View>
    </AndroidSafeAreaView>
  </SafeAreaProvider>;
}
