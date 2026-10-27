import * as FS from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import {createAudioPlayer,setAudioModeAsync} from 'expo-audio';
import {createSpeechController as createCore} from './speech-controller-core.mjs';
export function createSpeechController(){return createCore({FS,Speech,createAudioPlayer,setAudioModeAsync});}
