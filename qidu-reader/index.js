import {registerRootComponent} from 'expo';
import {Platform} from 'react-native';
import App from './App';

// Design preview is enabled explicitly for browser QA; native builds always open App.
const Root=Platform.OS==='web'&&process.env.EXPO_PUBLIC_UI_PREVIEW==='1'?require('./src/DesignPreview.jsx').default:App;
registerRootComponent(Root);
