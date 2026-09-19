// Prefer a natural Korean voice when the device offers one, and let sentences finish.
export function chooseKoreanVoice(voices){
  const rank=v=>(/natural|neural|premium|enhanced/i.test(v.name)?100:0)+(/google|siri|yuna|sora|sunhi/i.test(v.name)?50:0)+(v.localService===false?20:0)+(v.default?1:0);
  return voices.filter(v=>/^ko(?:-|_|$)/i.test(v.lang)).sort((a,b)=>rank(b)-rank(a))[0]??null;
}
export class KoreanNarrator {
  constructor(host=window){this.host=host;this.enabled=true;this.lastMessage='';this.status='idle';this.voiceLanguage=null;this.voiceName=null;this.current=null;this.pending=null}
  get supported(){return Boolean(this.host.speechSynthesis&&this.host.SpeechSynthesisUtterance)}
  stop(){this.current=null;this.pending=null;if(this.supported)this.host.speechSynthesis.cancel();this.status='idle'}
  setEnabled(enabled){this.enabled=enabled;if(!enabled)this.stop()}
  say(message){
    if(!this.enabled||!this.supported||this.host.document?.hidden)return;
    if(this.current){if(this.current.text!==message)this.pending=message;return}
    this.speak(message);
  }
  speak(message){
    const synth=this.host.speechSynthesis,utterance=new this.host.SpeechSynthesisUtterance(message),voice=chooseKoreanVoice(synth.getVoices());
    utterance.lang='ko-KR';utterance.rate=1;utterance.pitch=1;utterance.volume=1;
    if(voice)utterance.voice=voice;
    this.current=utterance;this.lastMessage=message;this.voiceLanguage=voice?.lang||'ko-KR';this.voiceName=voice?.name??null;this.status='queued';
    utterance.onstart=()=>{if(this.current===utterance)this.status='speaking'};
    const finish=status=>{
      if(this.current!==utterance)return;
      this.current=null;this.status=status;const next=this.pending;this.pending=null;
      if(next&&this.enabled&&!this.host.document?.hidden)this.speak(next);
    };
    utterance.onend=()=>finish('finished');utterance.onerror=e=>finish(e.error);synth.speak(utterance);
  }
  snapshot(){return {supported:this.supported,enabled:this.enabled,status:this.status,language:this.voiceLanguage,voice:this.voiceName,lastMessage:this.lastMessage}}
}
