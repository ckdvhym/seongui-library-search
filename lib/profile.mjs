const STOP = new Set('그리고 그러나 하지만 또는 대한 관련 관한 위한 통해 있는 없는 하는 되는 되어 이 그 저 것 수 등 및 책 도서 내용 이야기 사람 우리 내가 너가 매우 정말 그냥 조금 다시 더 가장 이런 저런 어떤 한 에서 으로 로서 에게 에는 이는 은 는 이 가 을 를 의 과 와 도 에 로 으로부터'.split(/\s+/));

export function cleanText(v){return String(v??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
export function norm(v){return cleanText(v).toLowerCase().replace(/[\s\-_/·:;,.!?()[\]{}'"“”‘’]+/g,'');}
export function tokenize(v){
  const m=cleanText(v).toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}|\d{2,}/g)||[];
  return m.filter(x=>!STOP.has(x));
}
function uniq(a){return [...new Set(a.filter(Boolean))];}

const TOPICS = [
 ['환경·기후',['환경','기후','기후변화','기후위기','지구온난화','탄소중립','탄소배출','생태','생태계','플라스틱','오염','재활용','자원순환','멸종','자연보호','에너지전환','환경문제']],
 ['인공지능·정보',['인공지능','ai','알고리즘','정보기술','정보사회','디지털','데이터','컴퓨터','코딩','프로그래밍','소프트웨어','로봇','머신러닝','딥러닝']],
 ['수학',['수학','수학자','기하','확률','통계','함수','미적분','대수','숫자','수리']],
 ['과학',['과학','과학자','물리','화학','생물','생명과학','천문','우주','지구과학','실험','분자','양자']],
 ['의학·약학',['의학','의료','의사','질병','약학','약사','신약','신약개발','의약품','치료','바이오','생명공학','유전','면역','제약','약물']],
 ['건축·도시',['건축','건축가','도시','도시설계','공간','주거','집','건물','인테리어','토목']],
 ['역사',['역사','한국사','세계사','근현대사','고대','중세','전쟁','왕조','식민지','독립운동']],
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

function includesTerm(text,term){return norm(text).includes(norm(term));}
function countTerm(text,term){const n=norm(text),t=norm(term);if(!n||!t)return 0;let c=0,p=0;while((p=n.indexOf(t,p))>=0){c++;p+=t.length;}return c;}
function evidenceFor(title,intro,toc,terms){
 let score=0,distinct=0,titleHits=0,introHits=0,tocHits=0;
 for(const term of terms){const th=countTerm(title,term),ih=countTerm(intro,term),oh=countTerm(toc,term);if(th+ih+oh>0)distinct++;titleHits+=th;introHits+=ih;tocHits+=oh;score+=Math.min(th,2)*5+Math.min(ih,4)*2+Math.min(oh,6)*0.45;}
 return {score,distinct,titleHits,introHits,tocHits};
}
function kdcType(kdc){const x=String(kdc||'').replace(/[^0-9.]/g,'');if(/^8\d3/.test(x))return '소설';if(/^8\d1/.test(x))return '시';if(/^8\d4/.test(x)||/^818/.test(x))return '에세이';if(/^8/.test(x))return '문학';return '비문학';}
export function originFromKdc(kdc,materialType){if(!['소설','시','에세이','문학'].includes(materialType))return null;const x=String(kdc||'').replace(/[^0-9.]/g,'');return ORIGIN_MAP[x.slice(0,2)]||null;}
function classicEvidence(title,intro,toc,publisher){
 const all=[title,intro,toc,publisher].filter(Boolean).join(' '); let score=0,reasons=[];
 const strong=['고전소설','고전 소설','고전문학','고전 문학','세계문학전집','세계 문학 전집','세계고전','세계 고전','한국고전','한국 고전','고전 명작','불멸의 고전','고전으로 꼽'];
 for(const t of strong)if(includesTerm(all,t)){score+=4;reasons.push(t);}
 if(/고전이\s*될|고전으로\s*남을/.test(cleanText(all)))score=Math.max(0,score-4);
 return {score,reasons:uniq(reasons)};
}

export function deriveProfile(book,meta={}){
 const title=cleanText(book?.identity?.title),author=cleanText(book?.identity?.author),publisher=cleanText(book?.identity?.publisher),intro=cleanText(meta.introduction),toc=cleanText(meta.toc);
 const materialType=kdcType(book?.holding?.kdc),primaryTopics=[],secondaryTopics=[],topicEvidence={};
 for(const [name,terms] of TOPICS){const ev=evidenceFor(title,intro,toc,terms);topicEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=2||(ev.introHits>=1&&ev.distinct>=2)||ev.score>=6)primaryTopics.push(name);else if(ev.score>=1.5)secondaryTopics.push(name);}
 const genres=[],genreEvidence={};for(const [name,terms] of GENRES){const ev=evidenceFor(title,intro,toc,terms);genreEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=1||ev.score>=3)genres.push(name);}if(materialType==='소설')genres.unshift('소설');if(materialType==='시')genres.unshift('시');if(materialType==='에세이')genres.unshift('에세이');
 const weighted=[];for(const t of tokenize(title))weighted.push(t,t,t,t);for(const t of tokenize(author))weighted.push(t,t);for(const t of tokenize(intro))weighted.push(t);for(const t of tokenize(toc).slice(0,300))weighted.push(t);const counts=new Map();for(const t of weighted)counts.set(t,(counts.get(t)||0)+1);const keywords=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,65).map(x=>x[0]);
 const emotions=[];for(const [name,terms] of EMOTIONS){const ev=evidenceFor(title,intro,'',terms);if(ev.titleHits>0||ev.introHits>=1||ev.score>=3)emotions.push(name);}const classic=classicEvidence(title,intro,toc,publisher);
 return {materialType,genres:uniq(genres),primaryTopics:uniq(primaryTopics),secondaryTopics:uniq(secondaryTopics.filter(x=>!primaryTopics.includes(x))),topics:uniq([...primaryTopics,...secondaryTopics]),topicEvidence,emotions:uniq(emotions),literatureOrigin:originFromKdc(book?.holding?.kdc,materialType),classicScore:classic.score,classicReasons:classic.reasons,keywords};
}

function queryOrigin(q){if(!/(소설|문학|시집|시\b|에세이|수필)/.test(q))return null;if(/한국|국내|우리나라/.test(q))return '한국';if(/일본/.test(q))return '일본';if(/중국/.test(q))return '중국';if(/프랑스/.test(q))return '프랑스';if(/독일/.test(q))return '독일';if(/영미|영국|미국/.test(q))return '영미';if(/이탈리아/.test(q))return '이탈리아';if(/스페인|포르투갈/.test(q))return '스페인·포르투갈';return null;}

export function interpretLocal(query){
 const q=cleanText(query),nq=norm(q),tokens=tokenize(q),material=[];
 if(/소설/.test(q))material.push('소설');if(/(^|\s)시($|\s)|시집|시를/.test(q))material.push('시');if(/에세이|수필/.test(q))material.push('에세이');
 const genres=[];for(const [name,terms] of GENRES)if(terms.some(t=>nq.includes(norm(t))))genres.push(name);
 const topics=[];for(const [name,terms] of TOPICS)if(terms.some(t=>nq.includes(norm(t))))topics.push(name);
 const emotions=[];if(/슬픈|슬픔|상실|애도|이별|비극/.test(q))emotions.push('슬픔·상실');if(/위로|회복|치유/.test(q))emotions.push('위로·회복');if(/무서운|공포|오싹|섬뜩/.test(q))emotions.push('긴장·공포');if(/유머|웃긴|유쾌|재미있는/.test(q))emotions.push('유머·경쾌');if(/반전/.test(q))emotions.push('반전');
 const focus=[];
 if(/신약\s*개발|신약개발/.test(q))focus.push({name:'신약개발',terms:['신약','신약개발','제약','의약품','약물개발','바이오의약','신약후보'],strict:true});
 if(/기후\s*위기/.test(q))focus.push({name:'기후위기',terms:['기후위기','기후변화','지구온난화','탄소중립','기후재난'],strict:true});
 if(/재테크|자산\s*관리|돈\s*(관련|관한)|투자\s*(관련|관한)/.test(q))focus.push({name:'재테크·금융',terms:['재테크','자산관리','투자','금융','저축','주식','펀드','채권','부동산','금리','자산','돈'],strict:true});
 const origin=queryOrigin(q),classicRequired=/(^|\s)고전($|\s)|고전소설|고전 소설|고전문학|고전 문학/.test(q),wantsAuthor=/작가|저자|소설가|시인/.test(q),complex=/진로|수행평가|탐구|관심|연결|하지만|싫어|재미있|추천|관련|한국|국내|중국|일본|프랑스|영미|고전|재테크/.test(q)||tokens.length>=5;
 return {query:q,tokens,material:uniq(material),genres:uniq(genres),topics:uniq(topics),emotions:uniq(emotions),origin,classicRequired,focus,wantsAuthor,complex};
}

function directEvidence(rec,terms){
 const title=cleanText(rec.title),intro=cleanText(rec.introPreview),kw=(rec.keywords||[]).join(' ');
 let score=0,distinct=0,titleHits=0,introHits=0,keywordHits=0;
 for(const term of terms){const th=countTerm(title,term),ih=countTerm(intro,term),kh=countTerm(kw,term);if(th+ih+kh>0)distinct++;titleHits+=th;introHits+=ih;keywordHits+=kh;score+=Math.min(th,2)*7+Math.min(ih,4)*2.5+Math.min(kh,3)*0.7;}
 return {score,distinct,titleHits,introHits,keywordHits};
}
function topicTerms(name){return TOPICS.find(x=>x[0]===name)?.[1]||[];}
function recordOrigin(rec){return originFromKdc(rec.kdc,rec.materialType)||rec.literatureOrigin||null;}

export function scoreRecord(rec,intent){
 const qn=norm(intent.query),titleN=norm(rec.title),authorN=norm(rec.author);let score=0;const reasons=[];
 if(titleN&&qn.includes(titleN)){score+=20;reasons.push('제목 일치');}if(authorN&&qn.includes(authorN)){score+=intent.wantsAuthor?18:5;reasons.push('저자 일치');}
 // 자료형/문학권은 점수가 아니라 필수 조건으로 먼저 판정한다.
 if(intent.material.length&&!intent.material.some(m=>rec.materialType===m||(rec.genres||[]).includes(m)))return null;
 if(intent.origin&&recordOrigin(rec)!==intent.origin)return null;
 if(intent.genres.length&&!intent.genres.every(g=>(rec.genres||[]).includes(g)))return null;
 if((intent.emotions||[]).length&&!intent.emotions.every(e=>(rec.emotions||[]).includes(e)))return null;
 if(intent.classicRequired){if(rec.materialType!=='소설'||Number(rec.classicScore||0)<4)return null;score+=12;reasons.push('고전 소설');}

 // 주제 검색은 저장된 넓은 태그만 믿지 않고 실제 제목/소개/키워드 근거를 다시 확인한다.
 for(const t of intent.topics){
   const ev=directEvidence(rec,topicTerms(t));
   const strict=/관련|관한|주제|문제|대해/.test(intent.query);
   if(strict && !(ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=5.5))return null;
   if(ev.titleHits>0){score+=14;reasons.push(t);}else if(ev.score>=5.5){score+=10;reasons.push(t);}else if(ev.score>=2.5){score+=4;}
 }
 for(const f of intent.focus||[]){const ev=directEvidence(rec,f.terms);if(f.strict&&!(ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=5.5))return null;score+=Math.min(14,5+ev.score);reasons.push(f.name);}
 for(const g of intent.genres){score+=10;reasons.push(g);}for(const m of intent.material){score+=8;reasons.push(m);}for(const e of intent.emotions||[]){score+=10;reasons.push(e);}if(intent.origin){score+=12;reasons.push(`${intent.origin} 문학`);}

 // 남은 일반어는 약한 보조 점수만 준다. 이것만으로 결과에 진입할 수는 없다.
 const searchN=norm([rec.title,rec.author,rec.publisher,(rec.keywords||[]).join(' ')].join(' '));let tokenMatches=0;for(const t of intent.tokens){if(searchN.includes(norm(t))){score+=0.5;tokenMatches++;}}
 const constrained=intent.topics.length||intent.genres.length||intent.emotions?.length||intent.origin||intent.classicRequired||intent.focus?.length||intent.material.length;
 const min=constrained?12:Math.max(5,Math.min(10,2+intent.tokens.length));if(score<min)return null;
 // 제약 없는 일반 검색에서도 검색어와 아무 직접 관련이 없는 책은 제외.
 if(!constrained&&!titleN.includes(qn)&&!authorN.includes(qn)&&tokenMatches===0)return null;
 return {score,reasons:uniq(reasons).slice(0,4)};
}
