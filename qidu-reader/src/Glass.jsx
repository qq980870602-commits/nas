import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Platform,Pressable,StyleSheet,Text,TextInput,Image,useColorScheme,View} from 'react-native';
import {BlurView} from 'expo-blur';
import {GlassView,isGlassEffectAPIAvailable,isLiquidGlassAvailable} from 'expo-glass-effect';
import {bundledTabs} from './bundled-theme.js';
import {rgba} from './appearance.mjs';
import {LinearGradient} from 'expo-linear-gradient';

const Appearance=createContext({});
export function AppearanceProvider({settings,children}){const scheme=useColorScheme();const value=scheme==='dark'&&settings?.appFollowSystem?{...settings,appBackground:settings.appDarkBackground,uiInk:settings.appDarkInk,cardColor:settings.darkCardColor}:settings||{};return <Appearance.Provider value={value}>{children}</Appearance.Provider>;}
export function useAppearance(){return useContext(Appearance);}
const GlassPreferences=createContext({reduceMotion:false,reduceTransparency:false});
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
export function GlassProvider({children}) {
  const [preferences,setPreferences]=useState({reduceMotion:false,reduceTransparency:false});
  useEffect(()=>{
    let active=true;
    const update=(key,value)=>{if(active)setPreferences(p=>({...p,[key]:value}));};
    AccessibilityInfo.isReduceMotionEnabled().then(value=>update('reduceMotion',value)).catch(()=>{});
    if(Platform.OS==='ios')Promise.resolve(AccessibilityInfo.isReduceTransparencyEnabled?.()??false).then(value=>update('reduceTransparency',value)).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>update('reduceMotion',value));
    const transparency=Platform.OS==='ios'?AccessibilityInfo.addEventListener('reduceTransparencyChanged',value=>update('reduceTransparency',value)):null;
    return()=>{active=false;motion.remove();transparency?.remove();};
  },[]);
  return <GlassPreferences.Provider value={preferences}>{children}</GlassPreferences.Provider>;
}
function AppearanceText({children,contentCard=false}){const appearance=useContext(Appearance);const apply=child=>{if(!React.isValidElement(child))return child;if(child.type===Animated.Text)return child;return React.cloneElement(child,{...(child.type===Text?{style:[child.props.style,contentCard?{color:appearance.uiInk||'#355B5D'}:null,appearance.uiFont&&appearance.uiFontFamily?{fontFamily:appearance.uiFontFamily}:null]}:{}),...(child.props.children?{children:React.Children.map(child.props.children,apply)}:{})});};return <>{React.Children.map(children,apply)}</>;}
export function ThemeText({style,...props}){const a=useContext(Appearance);return <Text {...props} style={[style,a.uiFont&&a.uiFontFamily?{fontFamily:a.uiFontFamily}:null]}/>;}
function nativeGlassSupported() {
  try{return Platform.OS==='ios'&&isGlassEffectAPIAvailable()&&isLiquidGlassAvailable();}catch{return false;}
}
export function GlassMaterial({radius=26,prominent=false,dark=false}) {
  const {reduceTransparency}=useContext(GlassPreferences);
  const appearance=useContext(Appearance);
  if(appearance.transparentMode)return <View pointerEvents='none' style={[StyleSheet.absoluteFill,{borderRadius:radius,backgroundColor:'transparent'}]}/>;
  if(appearance.glass===false)return <View pointerEvents='none' style={[StyleSheet.absoluteFill,{borderRadius:radius,backgroundColor:dark?'#29343B':'#F2F6F3'}]}/>;
  const nativeGlass=!reduceTransparency&&nativeGlassSupported();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:radius,overflow:'hidden'}]}>
    {reduceTransparency?<View style={[StyleSheet.absoluteFill,{backgroundColor:dark?'#29343B':'#F2F6F3'}]}/>:Platform.OS==='android'?<View style={[StyleSheet.absoluteFill,{backgroundColor:dark?'rgba(23,42,53,0.76)':'rgba(249,255,252,0.74)'}]}/>:nativeGlass?<GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme={dark?'dark':'light'} tintColor={dark?'#253B4B22':'#EAFBF228'}/>:<BlurView style={StyleSheet.absoluteFill} intensity={prominent?65:36} tint={dark?'systemThinMaterialDark':'systemThinMaterialLight'}/>}
    {!reduceTransparency&&<View style={[StyleSheet.absoluteFill,{backgroundColor:dark?'rgba(23,42,53,0.46)':nativeGlass?'rgba(255,255,255,0.12)':'rgba(249,255,252,0.43)'}]}/>}
    <LinearGradient colors={dark?['#FFFFFF24','#FFFFFF05','#9CDFCA16']:['#FFFFFFB8','#FFFFFF18','#D2EFEF38']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
    <View style={{position:'absolute',top:0,left:radius*.5,right:radius*.5,height:1,backgroundColor:dark?'#FFFFFF55':'#FFFFFFE8'}}/>
  </View>;
}
export function GlassSurface({children,style,onPress,onLongPress,disabled,prominent=false,dark=false,contentCard=false,...props}) {
  const {reduceMotion}=useContext(GlassPreferences),scale=useRef(new Animated.Value(1)).current;
  const interactive=!!(onPress||onLongPress),Component=interactive?AnimatedPressable:Animated.View;
  const appearance=useContext(Appearance),scheme=useColorScheme();
  const cardImage=scheme==='dark'?(appearance.cardImageDark||appearance.cardImageLight):appearance.cardImageLight;
  const radius=contentCard?(appearance.cardRadius??26):(StyleSheet.flatten(style)?.borderRadius??26);
  const contentStyle=contentCard?{borderWidth:appearance.borderWidth??1,borderColor:rgba(appearance.borderColor,appearance.borderOpacity??73),borderRadius:radius}:null;
  const animate=value=>{if(reduceMotion)return;Animated.spring(scale,{toValue:value,useNativeDriver:true,speed:28,bounciness:3}).start();};
  return <Component {...props} onPress={onPress} onLongPress={onLongPress} disabled={disabled} onPressIn={interactive?()=>animate(.977):undefined} onPressOut={interactive?()=>animate(1):undefined} accessibilityRole={interactive?'button':props.accessibilityRole} accessibilityState={interactive?{disabled:!!disabled,...props.accessibilityState}:props.accessibilityState} style={[g.surface,style,contentStyle,{backgroundColor:'transparent',borderRadius:radius},disabled&&{opacity:.42},interactive&&{transform:[{scale}]}]}>
    {!contentCard||appearance.cardEnabled!==false?<GlassMaterial radius={radius} prominent={prominent} dark={dark}/>:null}{contentCard&&appearance.cardEnabled!==false&&<View pointerEvents='none' style={[StyleSheet.absoluteFill,{borderRadius:radius,backgroundColor:rgba(appearance.cardColor,appearance.cardOpacity??43)}]}/>}{contentCard&&appearance.cardEnabled!==false&&cardImage&&<Image pointerEvents='none' source={{uri:cardImage}} resizeMode={appearance.cardImageMode||'cover'} style={[StyleSheet.absoluteFill,{borderRadius:radius,opacity:(appearance.cardOpacity??43)/100}]}/>}<AppearanceText contentCard={contentCard}>{children}</AppearanceText>
  </Component>;
}
export function GlassInput({style,...props}) {
  const flat=StyleSheet.flatten(style)||{};
  return <GlassSurface style={{marginTop:flat.marginVertical??0,marginBottom:flat.marginBottom??flat.marginVertical??0,borderRadius:flat.borderRadius??22,shadowOpacity:.045}}><TextInput {...props} placeholderTextColor={props.placeholderTextColor||'#6B7F83'} style={[style,{position:'relative',zIndex:1,backgroundColor:'transparent',marginVertical:0,marginBottom:0,borderWidth:0,color:'#203B42'}]}/></GlassSurface>;
}
export function GlassTabs({items,value,onChange,style}) {
  const appearance=useContext(Appearance);
  const [width,setWidth]=useState(0),position=useRef(new Animated.Value(0)).current;
  const {reduceMotion}=useContext(GlassPreferences);
  const itemWidth=Math.max(0,(width-12)/items.length),index=Math.max(0,items.indexOf(value));
  useEffect(()=>{
    if(!width||reduceMotion){position.setValue(index*itemWidth);return;}
    const animation=Animated.spring(position,{toValue:index*itemWidth,useNativeDriver:true,speed:18,bounciness:6});animation.start();return()=>animation.stop();
  },[width,itemWidth,index,reduceMotion]);
  return <GlassSurface prominent style={[style,{flexDirection:'row',padding:6}]} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    {width>0&&<Animated.View pointerEvents="none" style={{position:'absolute',top:6,bottom:6,left:6,width:itemWidth,borderRadius:32,borderWidth:1,borderColor:'#FFFFFFCC',backgroundColor:'#D1EEE378',transform:[{translateX:position}]}}><GlassMaterial radius={32}/></Animated.View>}
    {items.map((item,i)=><Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{selected:item===value}} onPress={()=>onChange(item)} style={{flex:1,minHeight:54,justifyContent:'center',alignItems:'center',gap:3}}>{appearance.bundledThemeEnabled&&bundledTabs[item]?<Image source={value===item?bundledTabs[item].selected:bundledTabs[item].normal} style={{width:31,height:31}} resizeMode='contain'/>:<Animated.Text style={{color:value===item?'#205E56':'#617A7E',fontSize:23}}>{{'书架':'▤','发现':'✧','书源':'◎','统计':'▥','设置':'◇','书签':'▣'}[item]}</Animated.Text>}{appearance.tabLabels!==false&&<Animated.Text style={{color:value===item?'#205E56':'#617A7E',fontSize:10,fontWeight:value===item?'700':'400'}}>{item}</Animated.Text>}</Pressable>)}
  </GlassSurface>;
}
const g=StyleSheet.create({surface:{borderRadius:26,borderWidth:1,borderColor:'rgba(255,255,255,0.73)',shadowColor:'#375F69',shadowOpacity:.1,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3}});
