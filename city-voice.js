import {PLAY_LINES} from './playground-layout.js';
import {ADVENTURE_LINES} from './adventure-layout.js';
import {RESCUE_LINES} from './rescue-state.js';
import layout from './city-layout.js';
import waterfront from './waterfront-layout.js';
const replacements={
  '헬기가 데리러 와요!':'헬리콥터가 데리러 와요.',
  '고가도로 입구로 가요 · 곡선 다리를 건너요':'고가도로 입구로 가요. 곡선 다리를 건너요.',
  '고가도로를 건넜어요!':'고가도로를 건넜어요!',
  '공항으로 걸어가요 · 비행기 탑승':'공항으로 걸어가서 비행기를 타요.',
  '도시 하늘 여행 · 공항에 돌아오면 내려요':'비행기를 타고 도시 하늘을 여행해요.',
  '공항에 도착했어요!':'공항에 도착했어요!',
  '동물 친구는 차에서 내려서 만나러 가요':'동물 친구는 차에서 내려서 만나러 가요.',
  '동물원으로 가요 · 동물을 눌러 가까이 가세요':'동물원으로 가요. 동물 친구를 눌러 보세요.',
  '경찰차를 타고 도둑을 따라가요':'경찰차를 타고 도둑을 따라가요.',
  '도둑을 따라가요! 가까이 가면 잡을 수 있어요':'도둑을 따라가요! 가까이 가면 잡을 수 있어요.',
  '도둑 발견! 줄무늬 옷의 도둑을 눌러 따라가요':'도둑 발견! 줄무늬 옷의 도둑을 눌러 따라가요.',
  '비행기는 차에서 내려서 타요':'비행기는 차에서 내려서 타요.',
  '도착해서 내린 뒤 목적지를 골라 주세요':'도착해서 내린 뒤 목적지를 골라 주세요.',
  '지금 놀이가 끝나면 헬기를 불러 주세요':'지금 놀이가 끝나면 헬기를 불러 주세요.',
};
const direct=[
  ...RESCUE_LINES,...PLAY_LINES,...ADVENTURE_LINES,
  '엄마랑 손잡고 걸어요!','아빠랑 손잡고 걸어요!','엄마 아빠랑 손잡고 걸어요!','엄마는 잠깐 기다릴게요.','아빠는 잠깐 기다릴게요.','지금 놀이를 마치고 손을 잡아요.','역 입구를 누르면 다음 역으로 출발해요.',
  '킥보드 출발! 바닥을 누르면 슝슝 달려요.','킥보드에서 내렸어요. 걸어서 탐험해요.','지금 놀이를 마치고 킥보드를 타요.',
  '지하철 입구로 걸어가요.','계단을 내려가 지하 승강장으로 가요.','지하철 문이 열렸어요. 타 볼까요?',
  '지상에 도착했어요. 새 동네를 둘러봐요!','선착장으로 유람선을 타러 가요.','유람선에 탔어요. 강을 따라 여행해요!',
  '선착장에 도착했어요. 조심히 내려요.','강은 다리로 건너요. 유람선은 선착장에서 타요.',
  '어느 역으로 갈까요? 도착할 역을 골라 주세요.',
  '헬리콥터를 타고 목적지로 날아가요.','목적지에 도착했어요. 즐겁게 놀아요!',
  ...waterfront.stations.flatMap(s=>['문이 닫힙니다. 다음 역은 '+s.name+'입니다.',s.name+'에 도착했어요.']),
  ...layout.zoo.animals.map(a=>a.name+' 만나러 가요.'),
];
export const CITY_VOICE_LINES=[...new Set([...Object.values(replacements),...direct])];
const known=new Set(CITY_VOICE_LINES);
export function noticeVoice(text){
  if(replacements[text])return replacements[text];
  if(known.has(text))return text;
  if(text.startsWith('슝! '))return '헬리콥터를 타고 목적지로 날아가요.';
  if(text.endsWith(' 도착!'))return '목적지에 도착했어요. 즐겁게 놀아요!';
  if(known.has(text+'.'))return text+'.';
  return null;
}
