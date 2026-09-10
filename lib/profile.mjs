const STOP = new Set('그리고 그러나 하지만 또는 대한 관련 관한 위한 통해 있는 없는 하는 되는 되어 이 그 저 것 수 등 및 책 도서 내용 이야기 사람 우리 내가 너가 매우 정말 그냥 조금 다시 더 가장 이런 저런 어떤 한 에서 으로 로서 에게 에는 이는 은 는 이 가 을 를 의 과 와 도 에 로 으로부터 대해 돌아볼 돌아보는 관련된 관한된'.split(/\s+/));

export function cleanText(v){return String(v??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
export function norm(v){return cleanText(v).toLowerCase().replace(/[\s\-_/·:;,.!?()[\]{}'"“”‘’]+/g,'');}
export function tokenize(v){
  const m=cleanText(v).toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}|\d{2,}/g)||[];
  return m.filter(x=>!STOP.has(x));
}
function uniq(a){return [...new Set((a||[]).filter(Boolean))];}
function ntext(...parts){return norm(parts.filter(Boolean).join(' '));}

const TOPICS = [
 ['환경·기후',['환경','기후','기후변화','기후위기','지구온난화','탄소중립','탄소배출','생태','생태계','플라스틱','오염','재활용','자원순환','멸종','자연보호','에너지전환','환경문제']],
 ['인공지능·정보',['인공지능','ai','알고리즘','정보기술','정보사회','디지털','데이터','컴퓨터','코딩','프로그래밍','소프트웨어','로봇','머신러닝','딥러닝']],
 ['수학',['수학','수학자','기하','확률','통계','함수','미적분','대수','숫자','수리']],
 ['과학',['과학','과학자','물리','화학','생물','생명과학','천문','우주','지구과학','실험','분자','양자']],
 ['의학·약학',['의학','의료','의사','질병','약학','약사','신약','신약개발','의약품','치료','바이오','생명공학','유전','면역','제약','약물']],
 ['건축·도시',['건축','건축가','도시','도시설계','공간','주거','집','건물','인테리어','토목']],
 ['역사',['역사','한국사','세계사','근현대사','고대','중세','전쟁','왕조','식민지','독립운동','혁명']],
 ['철학·윤리',['철학','윤리','도덕','정의','행복','자유','존재','삶의의미','인문학']],
 ['사회·정치',['사회','정치','민주주의','법','불평등','노동','인권','차별','혐오','젠더','미디어','교육']],
 ['심리·감정',['심리','마음','감정','불안','우울','상실','슬픔','위로','회복','관계','외로움','자존감']],
 ['진로·직업',['진로','직업','취업','직업인','커리어','꿈','전공','학과']],
 ['예술·디자인',['예술','미술','디자인','음악','영화','사진','그림','회화','공예']],
 ['문학·글쓰기',['문학','소설','시','에세이','작가','글쓰기','문장','서사','독서']],
 ['여행·지리',['여행','지리','세계여행','도시여행','국가','지역','지도']],
 ['경제·경영',['경제','경영','기업','마케팅','투자','금융','돈','재테크','자산관리','자산','저축','주식','펀드','채권','부동산','시장','창업','소비','소득','금리']],
 ['스포츠',['스포츠','축구','야구','농구','운동','선수','체육']]
];

const GENRES = [
 ['추리·미스터리',['추리','미스터리','탐정','범죄','살인사건','범인','수사','스릴러']],
 ['SF',['sf','과학소설','에스에프','우주여행','미래사회','디스토피아','사이버펑크']],
 ['판타지',['판타지','마법','마법사','환상소설']],
 ['로맨스',['로맨스','연애소설','사랑이야기','첫사랑','연애']],
 ['역사소설',['역사소설','시대소설','대하소설']],
 ['성장소설',['성장소설','청소년소설','성장기','사춘기']],
 ['공포',['공포','호러','괴담','귀신']],
 ['유머',['유머','코미디','웃음','재미있는']]
];

const EMOTIONS = [
 ['슬픔·상실',['슬픈','슬픔','상실','애도','이별','비극','눈물','가슴아픈','가슴 아픈','먹먹한']],
 ['위로·회복',['위로','회복','치유','희망','다시 살아갈']],
 ['긴장·공포',['긴장','공포','불안','두려움','섬뜩','오싹']],
 ['유머·경쾌',['유머','웃음','코믹','유쾌','경쾌']],
 ['반전',['반전','뜻밖의 결말','예상 밖의 결말','충격적 결말']]
];

const ORIGIN_MAP = {'81':'한국','82':'중국','83':'일본','84':'영미','85':'독일','86':'프랑스','87':'스페인·포르투갈','88':'이탈리아','89':'기타'};
const ORIGIN_STRONG = {
 '한국':['한국문학','한국 문학','한국소설','한국 소설','한국 작가','한국작가','한국인 작가','한국의 소설가'],
 '중국':['중국문학','중국 문학','중국소설','중국 소설','중국 작가','중국작가','중국의 소설가'],
 '일본':['일본문학','일본 문학','일본소설','일본 소설','일본 작가','일본작가','일본의 소설가'],
 '영미':['영미문학','영미 문학','영국소설','영국 소설','미국소설','미국 소설','영국 작가','미국 작가'],
 '프랑스':['프랑스문학','프랑스 문학','프랑스소설','프랑스 소설','프랑스 작가','프랑스작가','프랑스의 소설가'],
 '독일':['독일문학','독일 문학','독일소설','독일 소설','독일 작가','독일작가'],
 '이탈리아':['이탈리아문학','이탈리아 문학','이탈리아소설','이탈리아 소설','이탈리아 작가'],
 '스페인·포르투갈':['스페인문학','스페인 문학','포르투갈문학','포르투갈 문학','스페인 소설','포르투갈 소설']
};
const WESTERN = ['서양철학','서양 철학','그리스철학','그리스 철학','로마철학','로마 철학','플라톤','아리스토텔레스','소크라테스','데카르트','스피노자','칸트','헤겔','니체','쇼펜하우어','키르케고르','사르트르','하이데거','푸코','들뢰즈','비트겐슈타인'];
const EASTERN = ['동양철학','동양 철학','중국철학','중국 철학','한국철학','한국 철학','인도철학','인도 철학','공자','맹자','노자','장자','주자','퇴계','율곡','유교','도가','도교','성리학'];
const CLASSIC_STRONG = ['세계문학전집','세계 문학 전집','민음사세계문학','민음사 세계문학','문학동네세계문학','문학동네 세계문학','을유세계문학','열린책들세계문학','펭귄클래식','창비세계문학','문예세계문학','세계고전','세계 고전','한국고전','한국 고전','고전소설','고전 소설','고전문학','고전 문학','고전명작','고전 명작'];
const CLASSIC_MEDIUM = ['불후의 명작','세계적인 명작','문학의 명작','시대를 초월','세대를 넘어 사랑','오랫동안 사랑받','필독 고전','고전 작품','문학사에 남','문학사상'];
const NOVEL_TEXT = ['장편소설','장편 소설','단편소설','단편 소설','소설집','소설 작품','소설가','소설로 출간','novel'];
const ESSAY_TEXT = ['에세이','수필집','산문집'];
const POETRY_TEXT = ['시집','시선집','시인'];

function countNorm(text,term){const n=norm(text),t=norm(term);if(!n||!t)return 0;let c=0,p=0;while((p=n.indexOf(t,p))>=0){c++;p+=t.length;}return c;}
function evidence(title,intro,toc,terms,{tocWeight=.55}={}){
 let score=0,distinct=0,titleHits=0,introHits=0,tocHits=0;
 for(const term of terms){const th=countNorm(title,term),ih=countNorm(intro,term),oh=countNorm(toc,term);if(th+ih+oh>0)distinct++;titleHits+=th;introHits+=ih;tocHits+=oh;score+=Math.min(th,2)*7+Math.min(ih,4)*2.5+Math.min(oh,8)*tocWeight;}
 return {score,distinct,titleHits,introHits,tocHits};
}
function kdcRaw(kdc){return String(kdc||'').replace(/[^0-9.]/g,'');}
function kdcPrimaryType(kdc){const x=kdcRaw(kdc);if(/^8\d3/.test(x))return '소설';if(/^8\d1/.test(x))return '시';if(/^8\d4/.test(x)||/^818/.test(x))return '에세이';if(/^8/.test(x))return '문학';return '비문학';}
function materialTypes(kdc,title,intro,toc){
 const out=[kdcPrimaryType(kdc)], all=[title,intro,toc].join(' ');
 if(NOVEL_TEXT.some(t=>norm(all).includes(norm(t))))out.push('소설');
 if(POETRY_TEXT.some(t=>norm(all).includes(norm(t))))out.push('시');
 if(ESSAY_TEXT.some(t=>norm(all).includes(norm(t))))out.push('에세이');
 return uniq(out);
}
export function originFromKdc(kdc,materialType){if(!['소설','시','에세이','문학'].includes(materialType))return null;const x=kdcRaw(kdc);return ORIGIN_MAP[x.slice(0,2)]||null;}
function originScores(kdc,materialType,title,intro,toc){
 const scores={};const k=originFromKdc(kdc,materialType);if(k)scores[k]=(scores[k]||0)+4;
 const all=[title,intro,toc].join(' ');
 for(const [name,terms] of Object.entries(ORIGIN_STRONG)){for(const t of terms)if(norm(all).includes(norm(t)))scores[name]=(scores[name]||0)+3;}
 return scores;
}
function philosophyScores(kdc,title,intro,toc){
 const x=kdcRaw(kdc),all=[title,intro,toc].join(' ');let west=0,east=0;
 if(/^16/.test(x))west+=4;if(/^15/.test(x))east+=4;
 for(const t of WESTERN){if(norm(all).includes(norm(t)))west+=norm(title).includes(norm(t))?4:2;}
 for(const t of EASTERN){if(norm(all).includes(norm(t)))east+=norm(title).includes(norm(t))?4:2;}
 return {west,east};
}
function classicEvidence(title,intro,toc,publisher){
 const all=[title,intro,toc,publisher].filter(Boolean).join(' ');let score=0,reasons=[];
 for(const t of CLASSIC_STRONG)if(norm(all).includes(norm(t))){score+=4;reasons.push(t);}
 for(const t of CLASSIC_MEDIUM)if(norm(all).includes(norm(t))){score+=2.2;reasons.push(t);}
 if(/고전이\s*될|고전으로\s*남을|새로운\s*고전/.test(cleanText(all)))score=Math.max(0,score-4);
 return {score,reasons:uniq(reasons)};
}
function topTokens(text,limit=160){const arr=tokenize(text),seen=new Set(),out=[];for(const t of arr){if(!seen.has(t)){seen.add(t);out.push(t);}if(out.length>=limit)break;}return out;}

export function deriveProfile(book,meta={}){
 const title=cleanText(book?.identity?.title),author=cleanText(book?.identity?.author),publisher=cleanText(book?.identity?.publisher),intro=cleanText(meta.introduction),toc=cleanText(meta.toc),kdc=book?.holding?.kdc||'';
 const mats=materialTypes(kdc,title,intro,toc),materialType=mats.includes('소설')?'소설':mats.includes('시')?'시':mats.includes('에세이')?'에세이':mats[0];
 const primaryTopics=[],secondaryTopics=[],topicEvidence={};
 for(const [name,terms] of TOPICS){const ev=evidence(title,intro,toc,terms);topicEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=2||(ev.introHits>=1&&ev.distinct>=2)||ev.score>=7)primaryTopics.push(name);else if(ev.score>=2.2)secondaryTopics.push(name);}
 const genres=[],genreEvidence={};for(const [name,terms] of GENRES){const ev=evidence(title,intro,toc,terms,{tocWeight:.25});genreEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=1||ev.score>=4)genres.push(name);}for(const m of ['소설','시','에세이'])if(mats.includes(m))genres.unshift(m);
 const weighted=[];for(const t of tokenize(title))weighted.push(t,t,t,t);for(const t of tokenize(author))weighted.push(t,t);for(const t of tokenize(intro))weighted.push(t);const counts=new Map();for(const t of weighted)counts.set(t,(counts.get(t)||0)+1);const keywords=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,80).map(x=>x[0]);
 const emotions=[];for(const [name,terms] of EMOTIONS){const ev=evidence(title,intro,'',terms);if(ev.titleHits>0||ev.introHits>=1||ev.score>=3.5)emotions.push(name);}const classic=classicEvidence(title,intro,toc,publisher),origins=originScores(kdc,materialType,title,intro,toc),phil=philosophyScores(kdc,title,intro,toc);
 const originBest=Object.entries(origins).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 return {materialType,materialTypes:mats,genres:uniq(genres),primaryTopics:uniq(primaryTopics),secondaryTopics:uniq(secondaryTopics.filter(x=>!primaryTopics.includes(x))),topics:uniq([...primaryTopics,...secondaryTopics]),topicEvidence,emotions:uniq(emotions),literatureOrigin:originBest,originScores:origins,philosophyScores:phil,classicScore:classic.score,classicReasons:classic.reasons,keywords,tocTokens:topTokens(toc,180)};
}

function queryOrigin(q){if(!/(소설|문학|시집|시\b|에세이|수필)/.test(q))return null;if(/한국|국내|우리나라/.test(q))return '한국';if(/일본/.test(q))return '일본';if(/중국/.test(q))return '중국';if(/프랑스/.test(q))return '프랑스';if(/독일/.test(q))return '독일';if(/영미|영국|미국/.test(q))return '영미';if(/이탈리아/.test(q))return '이탈리아';if(/스페인|포르투갈/.test(q))return '스페인·포르투갈';return null;}
function topicTerms(name){return TOPICS.find(x=>x[0]===name)?.[1]||[];}
function knownNormTerms(){return new Set([...TOPICS.flatMap(x=>x[1]),...GENRES.flatMap(x=>x[1]),...EMOTIONS.flatMap(x=>x[1]),'관련 관한 주제 문제 대해 소설 문학 시집 에세이 수필 고전 서양 동양 철학 책 도서'.split(/\s+/)].map(norm));}
const KNOWN=knownNormTerms();
function concreteTerms(q,tokens,hasAbstractFocus){if(hasAbstractFocus)return[];const out=[];for(const t of tokens){const nt=norm(t);if(KNOWN.has(nt))continue;if(/^(관련|관한|대한|위한|추천|진로|관심|연결|내용|이야기|분야)$/.test(t))continue;if(t.length>=2)out.push(t);}return uniq(out).slice(0,4);}

export function interpretLocal(query){
 const q=cleanText(query),nq=norm(q),tokens=tokenize(q),material=[];
 if(/소설/.test(q))material.push('소설');if(/(^|\s)시($|\s)|시집|시를/.test(q))material.push('시');if(/에세이|수필/.test(q))material.push('에세이');
 const genres=[];for(const [name,terms] of GENRES)if(terms.some(t=>nq.includes(norm(t))))genres.push(name);
 const topics=[];for(const [name,terms] of TOPICS)if(terms.some(t=>nq.includes(norm(t))))topics.push(name);
 const emotions=[];if(/슬픈|슬픔|상실|애도|이별|비극/.test(q))emotions.push('슬픔·상실');if(/위로|회복|치유/.test(q))emotions.push('위로·회복');if(/무서운|공포|오싹|섬뜩/.test(q))emotions.push('긴장·공포');if(/유머|웃긴|유쾌|재미있는/.test(q))emotions.push('유머·경쾌');if(/반전/.test(q))emotions.push('반전');
 const focus=[];
 if(/인생|삶을?\s*(돌아|성찰)|삶의\s*의미|어떻게\s*살|사는\s*법|살아가/.test(q))focus.push({name:'삶·인생 성찰',terms:['인생','삶','삶의 의미','죽음','행복','의미','성찰','자기성찰','존재','가치','선택','후회','관계','정체성','나답게'],strict:false,semantic:true});
 if(/신약\s*개발|신약개발/.test(q))focus.push({name:'신약개발',terms:['신약','신약개발','제약','의약품','약물개발','바이오의약','신약후보','임상시험'],strict:true});
 if(/기후\s*위기/.test(q))focus.push({name:'기후위기',terms:['기후위기','기후변화','지구온난화','탄소중립','기후재난'],strict:true});
 if(/재테크|자산\s*관리|돈\s*(관련|관한)|투자\s*(관련|관한)/.test(q))focus.push({name:'재테크·금융',terms:['재테크','자산관리','투자','금융','저축','주식','펀드','채권','부동산','금리','자산','돈'],strict:true});
 const origin=queryOrigin(q),classicRequired=/(^|\s)고전($|\s)|고전소설|고전 소설|고전문학|고전 문학/.test(q),wantsAuthor=/작가|저자|소설가|시인/.test(q);
 let philosophyTradition=null;if(/서양\s*철학/.test(q))philosophyTradition='서양철학';else if(/동양\s*철학/.test(q))philosophyTradition='동양철학';
 const abstract=focus.some(f=>f.semantic),requiredTerms=concreteTerms(q,tokens,abstract);
 const complex=/진로|수행평가|탐구|관심|연결|하지만|싫어|재미있|추천|관련|한국|국내|중국|일본|프랑스|영미|고전|재테크|인생|삶|철학/.test(q)||tokens.length>=5;
 return {query:q,tokens,material:uniq(material),genres:uniq(genres),topics:uniq(topics),emotions:uniq(emotions),origin,classicRequired,focus,wantsAuthor,complex,philosophyTradition,requiredTerms,softKeywords:[],softTopics:[]};
}

function recTextEvidence(rec,terms,{history=false}={}){
 const title=cleanText(rec.title),intro=cleanText(rec.introPreview),kw=(rec.keywords||[]).join(' '),toc=(rec.tocTokens||[]).join(' ');let score=0,distinct=0,titleHits=0,introHits=0,keywordHits=0,tocHits=0;
 for(const term of terms){const th=countNorm(title,term),ih=countNorm(intro,term),kh=countNorm(kw,term),oh=countNorm(toc,term);if(th+ih+kh+oh>0)distinct++;titleHits+=th;introHits+=ih;keywordHits+=kh;tocHits+=oh;score+=Math.min(th,2)*8+Math.min(ih,4)*3+Math.min(kh,3)*.8+Math.min(oh,5)*(history?2:.6);}
 return {score,distinct,titleHits,introHits,keywordHits,tocHits};
}
function recOriginScore(rec,name){return Number(rec.originScores?.[name]||0)+(rec.literatureOrigin===name?1:0);}
function materialMatch(rec,m){return (rec.materialTypes||[rec.materialType]).includes(m)||(rec.genres||[]).includes(m);}
function philosophyMatch(rec,kind){const west=Number(rec.philosophyScores?.west||0),east=Number(rec.philosophyScores?.east||0);if(kind==='서양철학')return west>=3&&west>=east;if(kind==='동양철학')return east>=3&&east>=west;return true;}
function classicScore(rec){return Number(rec.classicScore||0);}
function isHistoryQuery(intent){return intent.topics.includes('역사')||/역사|전쟁|왕조|혁명|시대|고대|중세|근대|현대/.test(intent.query);}

export function scoreRecord(rec,intent){
 const qn=norm(intent.query),titleN=norm(rec.title),authorN=norm(rec.author);let score=0;const reasons=[];
 if(titleN&&qn.includes(titleN)){score+=22;reasons.push('제목 일치');}if(authorN&&qn.includes(authorN)){score+=intent.wantsAuthor?18:4;reasons.push('저자 일치');}
 if(intent.material.length&&!intent.material.every(m=>materialMatch(rec,m)))return null;
 if(intent.origin&&recOriginScore(rec,intent.origin)<3)return null;
 if(intent.genres.length&&!intent.genres.every(g=>(rec.genres||[]).includes(g)))return null;
 if(intent.emotions.length&&!intent.emotions.every(e=>(rec.emotions||[]).includes(e)))return null;
 if(intent.philosophyTradition&&!philosophyMatch(rec,intent.philosophyTradition))return null;
 if(intent.classicRequired){if(!materialMatch(rec,'소설'))return null;if(classicScore(rec)<2.2)return null;score+=13+Math.min(7,classicScore(rec));reasons.push('고전 소설');}

 // 사용자가 직접 쓴 구체명(연산군, 프랑스 등)은 제목·소개·목차 중 실제 근거가 있어야 한다.
 const hist=isHistoryQuery(intent);
 for(const term of intent.requiredTerms||[]){const ev=recTextEvidence(rec,[term],{history:hist});if(ev.titleHits+ev.introHits+ev.tocHits===0)return null;score+=Math.min(13,4+ev.score);reasons.push(term);}

 for(const t of intent.topics){const ev=recTextEvidence(rec,topicTerms(t),{history:t==='역사'});const strict=/관련|관한|주제|문제|대해/.test(intent.query);if(strict&&!(ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=7))return null;if(ev.titleHits>0){score+=13;reasons.push(t);}else if(ev.score>=7){score+=9;reasons.push(t);}else if(ev.score>=3){score+=3;}}
 for(const f of intent.focus||[]){const ev=recTextEvidence(rec,f.terms,{history:false});if(f.strict&&!(ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=7))return null;if(f.semantic){if(ev.titleHits+ev.introHits===0&&ev.distinct<2&&ev.score<3)return null;score+=Math.min(17,5+ev.score);reasons.push(f.name);}else{score+=Math.min(15,5+ev.score);reasons.push(f.name);}}
 if(intent.philosophyTradition){score+=14;reasons.push(intent.philosophyTradition);}for(const g of intent.genres){score+=10;reasons.push(g);}for(const m of intent.material){score+=8;reasons.push(m);}for(const e of intent.emotions){score+=10;reasons.push(e);}if(intent.origin){score+=12;reasons.push(`${intent.origin} 문학`);}

 // AI가 보태는 의미어는 절대로 필수조건이 되지 않고 순위만 보정한다.
 for(const t of intent.softTopics||[]){const ev=recTextEvidence(rec,topicTerms(t));if(ev.score>=4)score+=Math.min(4,ev.score/2);}
 for(const t of intent.softKeywords||[]){const ev=recTextEvidence(rec,[t],{history:hist});if(ev.score>0)score+=Math.min(3,ev.score/3);}

 const searchN=ntext(rec.title,rec.author,rec.publisher,(rec.keywords||[]).join(' '),(rec.tocTokens||[]).join(' '));let tokenMatches=0;for(const t of intent.tokens){if(searchN.includes(norm(t))){score+=.35;tokenMatches++;}}
 const constrained=intent.topics.length||intent.genres.length||intent.emotions.length||intent.origin||intent.classicRequired||intent.focus.length||intent.material.length||intent.philosophyTradition||(intent.requiredTerms||[]).length;
 const min=constrained?12:Math.max(5,Math.min(10,2+intent.tokens.length));if(score<min)return null;if(!constrained&&!titleN.includes(qn)&&!authorN.includes(qn)&&tokenMatches===0)return null;
 return {score,reasons:uniq(reasons).slice(0,4)};
}

export function auditRecordAgainstIntent(rec,intent){
 const problems=[];if(intent.material.length&&!intent.material.every(m=>materialMatch(rec,m)))problems.push('자료형');if(intent.origin&&recOriginScore(rec,intent.origin)<3)problems.push('문학권');if(intent.philosophyTradition&&!philosophyMatch(rec,intent.philosophyTradition))problems.push('철학권역');if(intent.classicRequired&&classicScore(rec)<2.2)problems.push('고전근거');for(const t of intent.requiredTerms||[]){const ev=recTextEvidence(rec,[t],{history:isHistoryQuery(intent)});if(ev.titleHits+ev.introHits+ev.tocHits===0)problems.push(`필수어:${t}`);}return problems;
}
