import {interpretLocal,scoreRecord} from '../lib/profile.mjs';

let pass=0, fail=0;
function ok(name,cond,detail=''){
 if(cond){pass++;console.log('PASS',name)}else{fail++;console.error('FAIL',name,detail)}
}
function rec({id='r',title='',author='',kdc='',intro='',genres=[],materialTypes=[],emotions=[],topics=[],keywords=[],tocTokens=[],originScores={},literatureOrigin=null}={}){
 return {id,title,author,publisher:'',year:'2025',kdc,introPreview:intro,genres,materialTypes,materialType:materialTypes[0]||'',emotions,primaryTopics:topics,topics,keywords,tocTokens,originScores,literatureOrigin,classicScore:0,classicMeta:false,philosophyScores:{west:0,east:0}};
}
function withSemantic(intent,{direct=[],related=[],context=[],kind='topic'}={}){
 return {...intent,requiredTerms: intent.directLookup?[]:intent.requiredTerms,semanticAssist:true,semanticFallback:!!intent.directLookup,semanticKind:kind,semanticDirectKeywords:[intent.query,...direct],semanticRelatedKeywords:related,semanticContextKeywords:context,semanticCoreKeywords:[intent.query,...direct,...related]};
}
function score(r,i,level=0){return scoreRecord(r,{...i,relaxLevel:level});}

// 1. 파서 회귀: 짧은 단어가 다른 단어 내부에 섞여 잘못된 주제로 잡히지 않아야 한다.
let x=interpretLocal('가족 관련 시집');
ok('시집이 건축의 집으로 해석되지 않음',!x.topics.includes('건축·도시'),JSON.stringify(x));
let sportQ=interpretLocal('운동 관련 책');
ok('운동이 경제의 돈으로 해석되지 않음',!sportQ.topics.includes('경제·경영')&&sportQ.topics.includes('스포츠'),JSON.stringify(sportQ));
let methodQ=interpretLocal('좋은 방법에 관한 책');
ok('방법이 사회정치의 법으로 해석되지 않음',!methodQ.topics.includes('사회·정치'),JSON.stringify(methodQ));
ok('가족 관련 시집은 시 자료형',x.material.includes('시'),JSON.stringify(x));
let ja1=interpretLocal('일본문학'), ja2=interpretLocal('일본 문학');
ok('일본문학/일본 문학 문학권 동일',ja1.origin==='일본'&&ja2.origin==='일본',JSON.stringify({ja1,ja2}));
ok('일본문학 띄어쓰기 때문에 추가 주제 생기지 않음',JSON.stringify(ja1.topics)===JSON.stringify(ja2.topics),JSON.stringify({a:ja1.topics,b:ja2.topics}));
let climate=interpretLocal('기후 위기 관련 소설');
ok('기후위기 소설은 소설 자료형 유지',climate.material.includes('소설'));
ok('기후위기는 환경·기후 의미군으로 처리',climate.topics.includes('환경·기후'));
ok('기후위기를 일회성 strict focus로 중복 강제하지 않음',!climate.focus.some(f=>f.name==='기후위기'),JSON.stringify(climate.focus));
let conf=interpretLocal('공자');
ok('공자는 개별 하드코딩 없이 의미검색 대상으로 남음',conf.directLookup&&conf.explicitConcepts.length===0,JSON.stringify(conf));

// 2. 자료형은 사용자가 명시했을 때 끝까지 보존한다.
let fam=withSemantic(interpretLocal('가족 관련 시'),{direct:['가족'],related:['엄마','아버지','부모','형제','가정'],context:['돌봄','관계']});
const familyPoem=rec({title:'엄마에게',kdc:'811.7',intro:'엄마와 아버지, 우리 가족을 떠올리는 시들을 묶은 시집이다.'});
const familyEssay=rec({title:'가족의 시간',kdc:'814.7',intro:'엄마와 아버지, 가족의 관계를 돌아보는 산문집이다.'});
const familySociety=rec({title:'가족과 사회',kdc:'332.2',intro:'현대 가족의 구조와 부모 자녀 관계를 분석한다.'});
ok('가족 관련 시: 실제 시집 통과',!!score(familyPoem,fam,0));
ok('가족 관련 시: 에세이 제외',!score(familyEssay,fam,2));
ok('가족 관련 시: 사회과학 책 제외',!score(familySociety,fam,2));

let lovePoem=withSemantic(interpretLocal('사랑 관련 시'),{direct:['사랑'],related:['연인','그리움','마음'],context:['관계']});
const poemLove=rec({title:'사랑시 100선',kdc:'808.1',intro:'사랑과 그리움을 노래한 시 100편을 모았다.'});
const loveEssay=rec({title:'사랑의 기술',kdc:'181.7',intro:'사랑과 관계를 철학적으로 살핀다.'});
ok('사랑 관련 시: 시선집 통과',!!score(poemLove,lovePoem,0));
ok('사랑 관련 시: 비시집 제외',!score(loveEssay,lovePoem,2));

// 3. 단계적 완화: 자료형은 유지하고 의미만 넓어진다.
const climateDirect=rec({title:'뜨거워진 지구',kdc:'813.7',intro:'기후위기와 기후변화로 무너지는 미래를 그린 장편소설.'});
const climateRelated=rec({title:'마지막 숲',kdc:'813.7',intro:'생태계 붕괴와 멸종, 환경 재난 이후의 삶을 그린 장편소설.'});
const climateNonfiction=rec({title:'기후위기 교과서',kdc:'539.9',intro:'기후변화와 탄소중립을 설명하는 과학 교양서.'});
ok('기후위기 소설: 직접 근거 소설 통과',!!score(climateDirect,climate,0));
ok('기후위기 소설: 생태·환경 위기 소설은 완화 단계에서 통과',!!score(climateRelated,climate,1));
ok('기후위기 소설: 비소설은 완화해도 제외',!score(climateNonfiction,climate,2));

// 4. 장르 보호: 로맨스는 잘 나오되 사랑이 곁가지인 전쟁/무협은 제외.
const romance=interpretLocal('로맨스');
const romanceBook=rec({title:'우리의 첫사랑',kdc:'813.7',intro:'두 사람의 첫사랑과 연애를 그린 로맨스 소설.'});
const warLove=rec({title:'전쟁과 사랑',kdc:'813.7',intro:'전쟁과 전투가 중심인 대하소설로 인물의 사랑도 일부 다룬다.'});
ok('로맨스: 직접 로맨스 통과',!!score(romanceBook,romance,0));
ok('로맨스: 전쟁 중심 사랑 곁가지 제외',!score(warLove,romance,0));

// 5. 엔터티 의미 확장: context 한 단어만으로는 통과하지 않는다.
let nazi=withSemantic(interpretLocal('나치'),{direct:['나치즘','국가사회주의'],related:['히틀러','제3제국','홀로코스트','아우슈비츠'],context:['독일','제2차세계대전','파시즘'],kind:'entity'});
const naziGood=rec({title:'홀로코스트의 기억',kdc:'925',intro:'나치 독일과 아우슈비츠의 역사를 다룬다.'});
const naziContext=rec({title:'독일의 전쟁사',kdc:'925',intro:'제2차세계대전 독일군의 전투를 살펴본다.'});
ok('나치: 강한 연관개념 통과',!!score(naziGood,nazi,0));
ok('나치: 독일/세계대전 맥락만으로는 제외',!score(naziContext,nazi,0));

let kong=withSemantic(interpretLocal('공자'),{direct:['유학'],related:['논어','맹자','성리학'],context:['동양철학','중국사상'],kind:'entity'});
const kongGood=rec({title:'논어',kdc:'148.3',intro:'공자의 말씀과 유학 사상을 담은 고전.'});
const kongContext=rec({title:'동양철학 입문',kdc:'150',intro:'동양철학의 여러 전통을 폭넓게 소개한다.'});
ok('공자: 논어/유학 직접 연관 통과',!!score(kongGood,kong,0));
ok('공자: 동양철학 일반서만으로는 제외',!score(kongContext,kong,0));

let cathedral=withSemantic(interpretLocal('성당'),{direct:['가톨릭성당','천주교성당'],related:['가톨릭','천주교','미사','교황','바티칸'],context:['교회건축','종교건축','신앙'],kind:'entity'});
const cathedralGood=rec({title:'유럽의 성당',kdc:'612.3',intro:'가톨릭 성당과 천주교 건축을 소개한다.'});
const astronomy=rec({title:'나는 어쩌다 명왕성을 죽였나',kdc:'443.49',intro:'태양계와 명왕성의 발견사를 다룬 천문학 책.'});
ok('성당: 가톨릭 성당 책 통과',!!score(cathedralGood,cathedral,0));
ok('성당: 무관한 천문학 책 제외',!score(astronomy,cathedral,2));

// 6. 감정 검색: 좁은 조합이 넓은 검색보다 오히려 잘 나오는 역전 방지.
const sad=interpretLocal('슬픈 책');
const sadBook=rec({title:'이별 이후',kdc:'818',intro:'상실과 이별, 애도의 시간을 지나며 슬픔을 견디는 이야기.',emotions:['슬픔·상실']});
ok('슬픈 책: 슬픔 근거 책 통과',!!score(sadBook,sad,0));
const sadRomance=interpretLocal('슬픈 로맨스');
const sadLove=rec({title:'마지막 편지',kdc:'813.7',intro:'사랑하는 연인과의 이별과 상실을 그린 슬픈 로맨스 소설.',emotions:['슬픔·상실']});
ok('슬픈 로맨스: 감정+장르 동시 충족',!!score(sadLove,sadRomance,0));

// 7. 단편소설: 소설 자료형과 단편 근거를 모두 만족해야 한다.
const short=interpretLocal('단편 소설');
const shortGood=rec({title:'한국 단편선',kdc:'813.7',intro:'여러 작가의 단편소설을 모은 단편집.'});
const longNovel=rec({title:'긴 장편',kdc:'813.7',intro:'한 가족의 백 년을 그린 장편소설.'});
ok('단편 소설: 단편집 통과',!!score(shortGood,short,0));
ok('단편 소설: 장편소설 제외',!score(longNovel,short,0));


// 8. 기존에 잘 되던 고전소설은 808 전집 분류 때문에 사라지지 않아야 한다.
const classicNovel=interpretLocal('고전 소설');
const hong=rec({title:'홍길동전',kdc:'808',intro:'허균의 대표 고전 작품.',genres:['문학'],materialTypes:['문학']});
hong.classicScore=5;hong.classicMeta=false;
ok('고전 소설: 808 전집의 홍길동전 보존',!!score(hong,classicNovel,0));

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
