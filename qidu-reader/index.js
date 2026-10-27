import {registerRootComponent} from 'expo';
import React from 'react';
import {Platform,ScrollView,Text,View,Pressable} from 'react-native';

// Load inside the boundary to show synchronous startup and render errors.
class StartupBoundary extends React.Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  render(){
    let App;
    let error=this.state.error;
    if(!error){try{App=Platform.OS==='web'&&process.env.EXPO_PUBLIC_UI_PREVIEW==='1'?require('./src/DesignPreview.jsx').default:require('./App').default;}catch(cause){error=cause;}}
    if(!error)return <App/>;
    return <View style={{flex:1,backgroundColor:'#F5F5EC',padding:24,paddingTop:72}}>
      <Text style={{fontSize:26,color:'#203B35',fontWeight:'700'}}>众阅启动遇到问题</Text>
      <Text style={{fontSize:16,color:'#34473F',marginTop:20,lineHeight:25}}>请截图下面的错误信息反馈。此页面不会清除书架和设置。</Text>
      <ScrollView style={{marginTop:20,flex:1}}><Text selectable style={{fontSize:14,color:'#50312B',lineHeight:22}}>{String(error.message||error).slice(0,1200)}</Text></ScrollView>
      <Pressable onPress={()=>this.setState({error:null})} style={{padding:18,backgroundColor:'#DCE8D3',borderRadius:18,marginVertical:24}}><Text style={{fontSize:17,textAlign:'center',color:'#203B35'}}>重试启动</Text></Pressable>
    </View>;
  }
}
registerRootComponent(StartupBoundary);
