import {NARRATION_CLIPS} from './audio/ko/catalog.js';

// Share the game's gesture-unlocked AudioContext, including delayed iPad events.
export class KoreanNarrator {
  constructor(host=window){
    this.host=host;this.enabled=true;this.lastMessage='';this.status='idle';
    this.context=null;this.current=null;this.pending=null;this.buffers=new Map();
  }
  get supported(){return Boolean(this.context||this.host.AudioContext||this.host.webkitAudioContext)}
  connect(context){
    this.context=context;
    if(this.pending&&this.enabled){const message=this.pending;this.pending=null;this.speak(message)}
  }
  stop(){
    const current=this.current;this.current=null;this.pending=null;this.status='idle';
    if(current?.source){current.source.onended=null;current.source.stop();current.source.disconnect()}
  }
  setEnabled(enabled){this.enabled=enabled;if(!enabled)this.stop()}
  say(message){
    if(!this.enabled||this.host.document?.hidden)return;
    if(!NARRATION_CLIPS[message]){this.status=this.current?this.status:'missing-clip';return}
    if(!this.context){this.pending=message;this.status='waiting-for-touch';return}
    if(this.current){if(this.current.text!==message)this.pending=message;return}
    this.speak(message);
  }
  async load(message){
    const file=NARRATION_CLIPS[message];
    if(this.buffers.has(file))return this.buffers.get(file);
    const loading=(async()=>{
      const response=await this.host.fetch(new URL(file,import.meta.url));
      if(!response.ok)throw new Error('Audio unavailable');
      return this.context.decodeAudioData(await response.arrayBuffer());
    })();
    this.buffers.set(file,loading);
    try{
      const buffer=await loading;
      // Bound decoded PCM memory on tablets; MP3s remain browser-cacheable.
      while(this.buffers.size>16)this.buffers.delete(this.buffers.keys().next().value);
      return buffer;
    }catch(error){this.buffers.delete(file);throw error}
  }
  async speak(message){
    const current={text:message,source:null};this.current=current;
    this.lastMessage=message;this.status='loading';
    const finish=status=>{
      if(this.current!==current)return;
      current.source?.disconnect();this.current=null;this.status=status;
      const next=this.pending;this.pending=null;
      if(next&&this.enabled&&!this.host.document?.hidden)this.speak(next);
    };
    try{
      const buffer=await this.load(message);
      if(this.current!==current||!this.enabled||this.host.document?.hidden)return;
      const source=this.context.createBufferSource();source.buffer=buffer;
      source.connect(this.context.destination);current.source=source;
      source.onended=()=>finish('finished');source.start();this.status='speaking';
    }catch{finish('audio-unavailable')}
  }
  snapshot(){return {supported:this.supported,enabled:this.enabled,status:this.status,language:'ko-KR',voice:'Supertonic 3 · F1',source:'recorded',lastMessage:this.lastMessage,cachedClips:this.buffers.size}}
}
