// Shared by navigation, the game, map and Blender exporter.
export const FOREST={x:-233,z:-94,width:62,depth:118,entry:{x:-202,z:-46},name:'동물 친구 숲',icon:'🌳'};
export const EVENT_HUBS=[
  {id:'forest',x:-185,z:-55,name:'숲속 탐험 마당',icon:'🌰'},
  {id:'helpers',x:180,z:-60,name:'도움 마당',icon:'🧰'},
  {id:'picnic',x:180,z:-135,name:'햇살 과수원',icon:'🍎'},
  {id:'festival',x:190,z:145,name:'웃음 축제 마당',icon:'🎈'},
];
const definitions=[
  ['acorns','도토리 모으기','🌰','도토리를 모아 바구니에 넣어요.','다람쥐의 겨울 간식이 준비됐어요!','collect'],
  ['birdfeed','새 모이 주기','🐦','새 친구에게 모이를 나눠 줘요.','새들이 고맙다고 노래해요!','feed'],
  ['turtle','아기 거북 길 안내','🐢','아기 거북과 연못까지 걸어가요.','거북이가 연못에 도착했어요!','escort'],
  ['seedling','어린 나무 심기','🌱','흙을 파고 나무를 심고 물을 줘요.','작은 나무가 쑥쑥 자랐어요!','grow'],
  ['butterfly','나비 사진 찍기','🦋','꽃에 앉은 나비 사진을 찍어요.','예쁜 나비 사진 세 장을 찍었어요!','photo'],
  ['letters','편지 배달','💌','우체통에 편지를 배달해요.','편지 세 통을 모두 배달했어요!','deliver'],
  ['parcels','택배 정리','📦','택배 상자를 수레에 실어요.','택배 수레가 출발할 준비를 마쳤어요!','collect'],
  ['carwash','자동차 세차','🧽','비눗방울로 자동차를 깨끗하게 씻어요.','자동차가 반짝반짝 깨끗해졌어요!','wash'],
  ['tyres','정비소 타이어','🛞','타이어를 굴려 정비소에 가져다줘요.','타이어 준비 완료! 고마워요!','roll'],
  ['fence','무지개 울타리 칠하기','🎨','울타리에 예쁜 색을 칠해요.','알록달록 무지개 울타리가 됐어요!','paint'],
  ['apples','사과 수확','🍎','잘 익은 사과를 따서 모아요.','사과 바구니가 가득 찼어요!','collect'],
  ['carrots','당근 뽑기','🥕','흙에서 당근을 쏙쏙 뽑아요.','커다란 당근을 세 개 뽑았어요!','harvest'],
  ['juice','과일 주스 만들기','🧃','과일을 넣고 갈아서 주스를 따라요.','달콤한 과일 주스 완성!','cook'],
  ['bread','빵 굽기','🥐','반죽하고 빵을 굽고 접시에 담아요.','따끈따끈한 빵이 나왔어요!','cook'],
  ['picnic','소풍 상 차리기','🧺','소풍 돗자리에 맛있는 간식을 놓아요.','친구들과 함께 소풍을 즐겨요!','serve'],
  ['football','골 넣기','⚽','공을 톡 차서 골대에 넣어요.','골인! 세 골을 넣었어요!','kick'],
  ['bowling','볼링 놀이','🎳','공을 굴려 볼링 핀을 쓰러뜨려요.','우르르! 볼링 핀이 쓰러졌어요!','bowl'],
  ['drums','숲속 음악회','🥁','세 개의 북을 두드려 음악을 만들어요.','멋진 음악회였어요!','music'],
  ['kite','바람 따라 연 날리기','🪁','바람 그림을 따라 달리며 연을 날려요.','연이 하늘 높이 날아올랐어요!','fly'],
  ['treasure','보물 찾기','💎','반짝이는 보석을 찾아 보물 상자에 모아요.','보물 상자를 모두 채웠어요!','collect'],
];
const slots=[[-8,-15],[8,-15],[-8,0],[8,0],[0,15]];
export const VILLAGE_EVENTS=definitions.map(([id,name,icon,line,done,kind],i)=>{
  const hub=EVENT_HUBS[Math.floor(i/5)],slot=slots[i%5],x=hub.x+slot[0],z=hub.z+slot[1];
  const targets=[{x:x-2.8,z:z+1.5},{x,z:z+2.8},{x:x+2.8,z:z+1.5}];
  return {id,name,icon,line,done,kind,hub:hub.id,x,z,entry:{x,z:z+6},targets,stands:targets.map(p=>({x:p.x,z:p.z+1.15}))};
});
// A winding, open central trail with tree groups on either side.
export const FOREST_TRAIL=Array.from({length:25},(_,i)=>({x:-233+Math.sin(i/24*Math.PI*3)*8,z:-149+i*4.5}));
export const FOREST_TREES=Array.from({length:64},(_,i)=>{
  const row=Math.floor(i/4),side=i%4, z=-149+row*7.1,x=-233+Math.sin(row/15*Math.PI*3)*8+(side<2?-1:1)*(12+(side%2)*9);
  return [Math.max(-260,Math.min(-208,x)),z];
});
export const FOREST_SPECIES=[['bear','곰','🐻',.65],['panda','판다','🐼',.65],['tortoise','거북이','🐢',.5],['rhino','코뿔소','🦏',.76],['elephant','코끼리','🐘',.8],['kangaroo','캥거루','🦘',.72],['giraffe','기린','🦒',.85],['zebra','얼룩말','🦓',.75]];
export const ADVENTURE_LINES=[...VILLAGE_EVENTS.flatMap(e=>[e.line,e.done]),'반짝이는 그림을 눌러 주세요.','놀이를 마쳤어요. 다른 곳도 구경해요.',...FOREST_SPECIES.map(([,name])=>name+' 친구야, 안녕!'),'동물 친구 숲에 왔어요. 동물을 누르면 인사하러 가요.'];
export const EVENT_OBSTACLES=VILLAGE_EVENTS.flatMap(e=>[[e.x-3.3,e.x+3.3,e.z-2.5,e.z-.4],...e.targets.map(p=>[p.x-.58,p.x+.58,p.z-.58,p.z+.58])]);
