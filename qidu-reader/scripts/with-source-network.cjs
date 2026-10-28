const fs=require('fs'),path=require('path');
const {withInfoPlist,withAndroidManifest,withDangerousMod}=require('@expo/config-plugins');
module.exports=function withSourceNetwork(config){
 config=withInfoPlist(config,mod=>{const ats=mod.modResults.NSAppTransportSecurity||{};mod.modResults.NSAppTransportSecurity={...ats,NSAllowsArbitraryLoads:false,NSExceptionDomains:{...(ats.NSExceptionDomains||{}),'219.154.201.122':{NSExceptionAllowsInsecureHTTPLoads:true,NSIncludesSubdomains:false}}};return mod;});
 config=withAndroidManifest(config,mod=>{const app=mod.modResults.manifest.application[0];app.$['android:usesCleartextTraffic']='false';app.$['android:networkSecurityConfig']='@xml/zhongyue_network_security_config';return mod;});
 return withDangerousMod(config,['android',async mod=>{const dir=path.join(mod.modRequest.platformProjectRoot,'app/src/main/res/xml');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'zhongyue_network_security_config.xml'),'<?xml version="1.0" encoding="utf-8"?><network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">219.154.201.122</domain></domain-config></network-security-config>');return mod;}]);
};
