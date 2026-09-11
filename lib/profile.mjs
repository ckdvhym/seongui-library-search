const STOP = new Set('그리고 그러나 하지만 또는 대한 관련 관련된 관한 관한된 위한 통해 있는 없는 하는 되는 되어 된 이 그 저 것 수 등 및 책 도서 내용 이야기 사람 우리 내가 너가 매우 정말 그냥 조금 다시 더 가장 이런 저런 어떤 한 에서 으로 로서 에게 에는 이는 은 는 이 가 을 를 의 과 와 도 에 로 으로부터 대해 돌아볼 돌아보는 연계 연계된 연결 진학 전공 학과 학부 계열 추천'.split(/\s+/));

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
 ['위로·회복',['위로','회복','치유','힐링','따뜻한','따뜻하게','잔잔한','포근한','희망','다시 살아갈']],
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
const CLASSIC_META_TITLE = ['교육론','연구','이론','개론','해설','비평','강의','읽기','문장론','문학사','오디세이','길잡이','입문','수업','교재','교육'];
const CLASSIC_KOREAN_WORKS = ['구운몽','홍길동전','춘향전','심청전','흥부전','사씨남정기','허생전','박씨전','양반전','운영전','금오신화','토끼전','장화홍련전','옹고집전','최척전','전우치전','임경업전','숙향전','숙영낭자전','배비장전','호질','광문자전','공방전','국선생전','조신전'];
const CLASSIC_KOREAN_AUTHORS = ['김만중','허균','박지원','김시습','임제','신광한','작자미상','미상'];
const NOVEL_TEXT = ['장편소설','장편 소설','단편소설','단편 소설','소설집','소설 작품','소설로 출간','novel'];
const ESSAY_TEXT = ['에세이','수필집','산문집'];
const POETRY_TEXT = ['시집','시선집','시인'];

function countNorm(text,term){const n=norm(text),t=norm(term);if(!n||!t)return 0;let c=0,p=0;while((p=n.indexOf(t,p))>=0){c++;p+=t.length;}return c;}
function escRx(v){return String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function wholePhraseCount(text,term){const raw=cleanText(text).toLowerCase(),t=cleanText(term).toLowerCase();if(!raw||!t)return 0;const rx=new RegExp(`(^|[^가-힣a-z0-9])${escRx(t)}(?=$|[^가-힣a-z0-9])`,'g');return (raw.match(rx)||[]).length;}
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
function classicEvidence(title,intro,toc,publisher,kdc=''){
 const all=[title,intro,toc,publisher].filter(Boolean).join(' ');let score=0,reasons=[];
 for(const t of CLASSIC_STRONG)if(norm(all).includes(norm(t))){score+=4;reasons.push(t);}
 for(const t of CLASSIC_MEDIUM)if(norm(all).includes(norm(t))){score+=2.2;reasons.push(t);}
 // '고전소설을 설명하는 책'과 '고전소설 작품 자체'를 구분한다.
 const metaTitle=CLASSIC_META_TITLE.some(t=>norm(title).includes(norm(t)));
 if(metaTitle && /고전|문학/.test(title)) score-=7;
 if(/고전이\s*될|고전으로\s*남을|새로운\s*고전/.test(cleanText(all)))score-=4;
 const x=kdcRaw(kdc);
 if(/^813\.5/.test(x)){score+=3.5;reasons.push('한국 고전소설 분류');}
 else if(/^81[1-8]\.[0-5]/.test(x)){score+=1.6;reasons.push('한국 고전문학 분류');}
 for(const t of CLASSIC_KOREAN_WORKS){if(norm(title).includes(norm(t))){score+=5;reasons.push('한국 고전 작품');break;}}
 return {score:Math.max(0,score),reasons:uniq(reasons),metaTitle};
}
function topTokens(text,limit=160){const arr=tokenize(text),seen=new Set(),out=[];for(const t of arr){if(!seen.has(t)){seen.add(t);out.push(t);}if(out.length>=limit)break;}return out;}

export function deriveProfile(book,meta={}){
 const title=cleanText(book?.identity?.title),author=cleanText(book?.identity?.author),publisher=cleanText(book?.identity?.publisher),intro=cleanText(meta.introduction),toc=cleanText(meta.toc),kdc=book?.holding?.kdc||'';
 const mats=materialTypes(kdc,title,intro,toc),materialType=mats.includes('소설')?'소설':mats.includes('시')?'시':mats.includes('에세이')?'에세이':mats[0];
 const primaryTopics=[],secondaryTopics=[],topicEvidence={};
 for(const [name,terms] of TOPICS){const ev=evidence(title,intro,toc,terms);topicEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=2||(ev.introHits>=1&&ev.distinct>=2)||ev.score>=7)primaryTopics.push(name);else if(ev.score>=2.2)secondaryTopics.push(name);}
 const genres=[],genreEvidence={};for(const [name,terms] of GENRES){const ev=evidence(title,intro,toc,terms,{tocWeight:.25});genreEvidence[name]=Math.round(ev.score*10)/10;if(ev.titleHits>0||ev.introHits>=1||ev.score>=4)genres.push(name);}for(const m of ['소설','시','에세이'])if(mats.includes(m))genres.unshift(m);
 const weighted=[];for(const t of tokenize(title))weighted.push(t,t,t,t);for(const t of tokenize(author))weighted.push(t,t);for(const t of tokenize(intro))weighted.push(t);const counts=new Map();for(const t of weighted)counts.set(t,(counts.get(t)||0)+1);const keywords=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,80).map(x=>x[0]);
 const emotions=[];for(const [name,terms] of EMOTIONS){const ev=evidence(title,intro,'',terms);if(ev.titleHits>0||ev.introHits>=1||ev.score>=3.5)emotions.push(name);}const classic=classicEvidence(title,intro,toc,publisher,kdc),origins=originScores(kdc,materialType,title,intro,toc),phil=philosophyScores(kdc,title,intro,toc);
 const originBest=Object.entries(origins).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 return {materialType,materialTypes:mats,genres:uniq(genres),primaryTopics:uniq(primaryTopics),secondaryTopics:uniq(secondaryTopics.filter(x=>!primaryTopics.includes(x))),topics:uniq([...primaryTopics,...secondaryTopics]),topicEvidence,emotions:uniq(emotions),literatureOrigin:originBest,originScores:origins,philosophyScores:phil,classicScore:classic.score,classicReasons:classic.reasons,classicMeta:classic.metaTitle,keywords,tocTokens:topTokens(toc,180)};
}


// 사용자가 직접 명시한 세부 개념. 넓은 분야 태그와 분리해서 복합 검색의 AND 조건에 사용한다.
const EXPLICIT_CONCEPTS = [
 {name:'인공지능', query:[/인공지능/i,/\bai\b/i], terms:['인공지능','AI','머신러닝','딥러닝','인공지능 기술','생성형 AI']},
 {name:'환경 오염', query:[/환경\s*오염/,/오염\s*문제/], terms:['환경오염','환경 오염','환경문제','환경 문제','환경파괴','환경 파괴','대기오염','수질오염','토양오염','해양오염','플라스틱 오염','미세플라스틱','오염물질','폐기물','탄소배출','기후위기','기후 변화']},
 {name:'유전공학', query:[/유전\s*공학/,/유전자\s*(편집|조작|공학)/], terms:['유전공학','유전자공학','유전자 편집','유전자편집','유전자 조작','유전자조작','유전자','유전학','생명공학']},
 {name:'윤리', query:[/윤리/,/도덕적?\s*문제/], terms:['윤리','윤리적','생명윤리','연구윤리','과학윤리','도덕','윤리 문제','윤리적 쟁점']},
 {name:'자유주의', query:[/자유주의/,/리버럴리즘/i], terms:['자유주의','고전적 자유주의','신자유주의','liberalism','자유주의자']},
 {name:'경제 격차', query:[/경제\s*격차/,/소득\s*격차/,/빈부\s*격차/,/경제\s*불평등/,/소득\s*불평등/,/양극화/], terms:['경제격차','경제 격차','소득격차','소득 격차','빈부격차','빈부 격차','경제불평등','경제 불평등','소득불평등','소득 불평등','양극화','계층격차','계층 격차']},
 {name:'기후 위기', query:[/기후\s*위기/,/기후\s*변화/,/지구\s*온난화/], terms:['기후위기','기후 위기','기후변화','기후 변화','지구온난화','기후재난','탄소중립']},
 {name:'재테크', query:[/재테크/,/자산\s*관리/], terms:['재테크','자산관리','투자','금융','저축','주식','펀드','채권','부동산','금리','자산']},
 {name:'수의사', query:[/수의사/,/수의학/], terms:['수의사','수의학','동물병원','동물 의료','동물의료','동물 진료','동물진료','반려동물 진료','가축 질병','동물 질병'], required:true,wholeTerms:['수의사','수의학']},
 {name:'간호사', query:[/간호사/,/간호학/], terms:['간호사','간호학','간호','환자 간호','임상 간호'], required:true},
 {name:'약사', query:[/약사/,/약학/], terms:['약사','약학','의약품','약물','조제','제약'], required:true}
];
// 학과·진로형 질문은 '학과/연계/진학'을 주제가 아니라 검색 목적 표현으로 본다.
// 아래는 학교에서 자주 쓰는 넓은 전공군만 로컬에서 빠르게 처리하고,
// 나머지 학과명은 Gemini가 검색 1회 안에서 의미를 확장한다.
const MAJOR_AREAS = [
 {name:'경제학', rx:/경제\s*(학과|학부|전공)|경제학/, topics:['경제·경영'], core:['경제','경제학','거시경제','미시경제','경제정책'], terms:['경제','경제학','시장','금융','소비','소득','금리','거시경제','미시경제','경제정책']},
 {name:'간호학', rx:/간호\s*(학과|학부|전공)|간호학/, topics:['의학·약학'], core:['간호','간호학','간호사'], terms:['간호','간호학','간호사','환자','임상','의료','보건']},
 {name:'컴퓨터과학', rx:/(컴퓨터|소프트웨어|정보)\s*(학과|학부|전공)|컴퓨터공학|컴퓨터과학|소프트웨어학/, topics:['인공지능·정보'], core:['컴퓨터','컴퓨터과학','컴퓨터공학','프로그래밍','코딩','소프트웨어','알고리즘'], terms:['컴퓨터','컴퓨터과학','컴퓨터공학','프로그래밍','코딩','소프트웨어','알고리즘','데이터','인공지능','정보기술']},
 {name:'생명공학', rx:/생명\s*공학\s*(과|학과|학부|전공)?|바이오\s*(공학|학과|전공)/, topics:['의학·약학','과학'], core:['생명공학','바이오공학','유전공학','유전자','유전체','분자생물학','생명기술'], terms:['생명공학','바이오공학','바이오','유전공학','유전자','유전체','분자생물학','세포','생명과학','생명기술']},
 {name:'수의학', rx:/수의\s*(학과|학부|전공)|수의학/, topics:['의학·약학'], core:['수의학','수의사','동물의료','동물병원'], terms:['수의학','수의사','동물의료','동물병원','동물질병','가축질병']},
 {name:'약학', rx:/약\s*(학과|학부|전공)|약학/, topics:['의학·약학'], core:['약학','약사','의약품','약물','제약','신약'], terms:['약학','약사','의약품','약물','제약','신약']},
 {name:'건축학', rx:/건축\s*(학과|학부|전공)|건축학/, topics:['건축·도시'], core:['건축','건축학','건축가'], terms:['건축','건축학','건축가','도시','공간','주거','건물']},
 {name:'심리학', rx:/심리\s*(학과|학부|전공)|심리학/, topics:['심리·감정'], core:['심리','심리학','상담','인지'], terms:['심리','심리학','행동','인지','감정','상담','관계']}
];
function detectMajorIntent(q){
 const career=/학과|학부|전공|진학|진로|연계/.test(q);
 const hit=MAJOR_AREAS.find(x=>x.rx.test(q));
 return {career:career||!!hit,area:hit||null};
}
function extractExplicitConcepts(q){
 const out=[];
 for(const c of EXPLICIT_CONCEPTS){if(c.query.some(rx=>rx.test(q)))out.push({name:c.name,terms:c.terms,required:!!c.required,wholeTerms:c.wholeTerms||[]});}
 return out;
}
function hasCompoundConnector(q){return /(?:과|와|및|그리고|\+|×|x|&|,)/i.test(q);}

function queryOrigin(q){if(!/(소설|문학|시집|시\b|에세이|수필)/.test(q))return null;if(/한국|국내|우리나라/.test(q))return '한국';if(/일본/.test(q))return '일본';if(/중국/.test(q))return '중국';if(/프랑스/.test(q))return '프랑스';if(/독일/.test(q))return '독일';if(/영미|영국|미국/.test(q))return '영미';if(/이탈리아/.test(q))return '이탈리아';if(/스페인|포르투갈/.test(q))return '스페인·포르투갈';return null;}
function topicTerms(name){return TOPICS.find(x=>x[0]===name)?.[1]||[];}
function knownNormTerms(){return new Set([...TOPICS.flatMap(x=>x[1]),...GENRES.flatMap(x=>x[1]),...EMOTIONS.flatMap(x=>x[1]),...EXPLICIT_CONCEPTS.flatMap(x=>x.terms),'관련 관한 주제 문제 대해 배경 소설 문학 시집 에세이 수필 고전 서양 동양 철학 책 도서 한국 국내 우리나라 중국 일본 프랑스 독일 영미 영국 미국 이탈리아 스페인 포르투갈'.split(/\s+/)].map(norm));}
const KNOWN=knownNormTerms();
function stripKnownJosaToken(token){
 const raw=String(token||'').trim();
 if(!raw)return raw;
 const suffixes=['으로부터','에서부터','에게서','한테서','으로','에게','한테','에서','까지','부터','처럼','보다','과','와','랑','이랑','은','는','이','가','을','를','에','로','의','도','만'];
 for(const suf of suffixes){
  if(raw.endsWith(suf)&&raw.length>suf.length+1){const base=raw.slice(0,-suf.length);if(KNOWN.has(norm(base)))return base;}
 }
 return raw;
}
function concreteTerms(q,tokens,hasAbstractFocus,focus=[]){if(hasAbstractFocus)return[];const focusNorm=new Set(focus.flatMap(f=>f.terms||[]).map(norm));const out=[];for(const raw of tokens){const t=stripKnownJosaToken(raw),nt=norm(t);if(KNOWN.has(nt)||focusNorm.has(nt))continue;if([...(focus||[])].some(f=>(f.terms||[]).some(x=>norm(x).includes(nt)||nt.includes(norm(x)))))continue;if(/^(관련|관한|대한|위한|추천|진로|관심|연결|내용|이야기|분야|배경|고전|한국|국내|우리나라|문학|소설|시|시집|에세이|수필)$/.test(t))continue;if(t.length>=2)out.push(t);}return uniq(out).slice(0,4);}

export function interpretLocal(query){
 const q=cleanText(query),nq=norm(q),tokens=tokenize(q),material=[];
 const major=detectMajorIntent(q);
 if(/소설/.test(q))material.push('소설');if(/(^|\s)시($|\s)|시집|시를/.test(q))material.push('시');if(/에세이|수필/.test(q))material.push('에세이');
 const genres=[];for(const [name,terms] of GENRES)if(terms.some(t=>nq.includes(norm(t))))genres.push(name);
 let topics=[];for(const [name,terms] of TOPICS)if(terms.some(t=>nq.includes(norm(t))))topics.push(name);if(material.length&&!/문학|글쓰기|문장|작가/.test(q))topics=topics.filter(t=>t!=='문학·글쓰기');
 const emotions=[];if(/슬픈|슬픔|상실|애도|이별|비극/.test(q))emotions.push('슬픔·상실');if(/위로|회복|치유|따뜻한|잔잔한|포근한/.test(q))emotions.push('위로·회복');if(/무서운|공포|오싹|섬뜩/.test(q))emotions.push('긴장·공포');if(/유머|웃긴|유쾌|재미있는/.test(q))emotions.push('유머·경쾌');if(/반전/.test(q))emotions.push('반전');
 const focus=[];
 // '힐링'은 책 소개에 같은 단어가 없어도 위로·회복·새출발의 의미로 찾는다.
 if(/힐링|마음\s*(치유|회복)|지친\s*마음/.test(q))focus.push({name:'힐링·위로',kind:'healing',terms:['힐링','위로','회복','치유','위안','따뜻','포근','잔잔','희망','용기','새로운 시작','다시 시작','마음을 어루만','마음을 보듬','상처를 보듬','일상의 회복','성장','관계','가족','친구','일상'],strict:false,semantic:true});
 if(/인생|삶을?\s*(돌아|성찰)|삶의\s*의미|어떻게\s*살|사는\s*법|살아가/.test(q))focus.push({name:'삶·인생 성찰',terms:['인생','삶','삶의 의미','죽음','행복','의미','성찰','자기성찰','존재','가치','선택','후회','관계','정체성','나답게'],strict:false,semantic:true});
 if(/신약\s*개발|신약개발/.test(q))focus.push({name:'신약개발',terms:['신약','신약개발','제약','의약품','약물개발','바이오의약','신약후보','임상시험'],strict:true});
 if(/기후\s*위기/.test(q))focus.push({name:'기후위기',terms:['기후위기','기후변화','지구온난화','탄소중립','기후재난'],strict:true});
 if(/재테크|자산\s*관리|돈\s*(관련|관한)|투자\s*(관련|관한)/.test(q))focus.push({name:'재테크·금융',terms:['재테크','자산관리','투자','금융','저축','주식','펀드','채권','부동산','금리','자산','돈'],strict:true});
 if(/학교\s*(배경|에서|생활)|교내\s*(배경|생활)|학원물|고등학교\s*(배경|생활)/.test(q))focus.push({name:'학교 배경',kind:'school-setting',terms:['학교','고등학교','교실','교내','학교생활','학창시절','등교','전학','학생','선생님','교사','동급생','반 친구'],strict:true});
 const origin=queryOrigin(q),classicRequired=/(^|\s)고전($|\s)|고전소설|고전 소설|고전문학|고전 문학|고전\s*(한국|세계)\s*문학/.test(q),classicTarget=/고전\s*소설|고전소설/.test(q)?'소설':(/고전.*문학|문학.*고전/.test(q)?'문학':null),classicKorean=/고전\s*(한국|국문|우리나라)\s*문학|한국\s*고전\s*문학|한국\s*고전/.test(q),wantsAuthor=/작가|저자|소설가|시인/.test(q);
 let philosophyTradition=null;if(/서양\s*철학/.test(q))philosophyTradition='서양철학';else if(/동양\s*철학/.test(q))philosophyTradition='동양철학';
 const explicitConcepts=extractExplicitConcepts(q);
 const compoundConcepts=explicitConcepts.length>=2 && hasCompoundConnector(q);
 if(major.area){for(const t of major.area.topics)if(!topics.includes(t))topics.push(t);focus.push({name:major.area.name+' 전공',terms:major.area.terms,coreTerms:major.area.core||major.area.terms,strict:false,semantic:true,major:true});}
 const abstract=focus.some(f=>f.semantic)||major.career,requiredTerms=concreteTerms(q,tokens,abstract,focus);
 const complex=/진로|진학|학과|학부|전공|연계|수행평가|탐구|관심|연결|하지만|싫어|재미있|추천|관련|한국|국내|중국|일본|프랑스|영미|고전|재테크|인생|삶|철학|힐링|학교\s*배경|학원물/.test(q)||tokens.length>=5;
 const directLookup=!complex&&!material.length&&!genres.length&&!topics.length&&!emotions.length&&!origin&&!classicRequired&&!focus.length&&!philosophyTradition&&!explicitConcepts.length&&tokens.length<=3;
 return {query:q,tokens,majorIntent:major.career,majorArea:major.area?.name||null,material:uniq(material),genres:uniq(genres),topics:uniq(topics),emotions:uniq(emotions),origin,classicRequired,classicTarget,classicKorean,focus,wantsAuthor,complex,directLookup,philosophyTradition,requiredTerms,explicitConcepts,compoundConcepts,softKeywords:[],softTopics:[]};
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
function isLiterary(rec){return (rec.materialTypes||[rec.materialType]).some(m=>['소설','시','에세이','문학'].includes(m))||/^8/.test(kdcRaw(rec.kdc));}
function isKoreanClassic(rec){const t=norm(rec.title),x=kdcRaw(rec.kdc),origin=recOriginScore(rec,'한국'),known=CLASSIC_KOREAN_WORKS.some(w=>t.includes(norm(w))),author=norm(rec.author),knownAuthor=CLASSIC_KOREAN_AUTHORS.some(a=>author.includes(norm(a)));const textual=/한국\s*고전|고전\s*한국|고전소설|고전\s*소설|조선\s*(시대|문학|소설)|고려\s*(시대|문학|소설)|한문\s*소설|고전\s*산문/.test(cleanText([rec.title,rec.introPreview,(rec.keywords||[]).join(' ')].join(' ')));const anthology=/^810\.82/.test(x);return known||(knownAuthor&&(/^81/.test(x)||/^808/.test(x)))||(anthology&&classicScore(rec)>=0.6)||(/^813\.[0-5]/.test(x)&&classicScore(rec)>=0.5)||(/^81/.test(x)&&classicScore(rec)>=1.0)||(origin>=2&&classicScore(rec)>=1.3)||textual;}
function isHistoryQuery(intent){return intent.topics.includes('역사')||/역사|전쟁|왕조|혁명|시대|고대|중세|근대|현대/.test(intent.query);}
function explicitConceptMatch(rec,concept){
 const ev=recTextEvidence(rec,concept.terms,{history:false});
 if((concept.wholeTerms||[]).length){
  const text=[rec.title,rec.introPreview,(rec.keywords||[]).join(' '),(rec.tocTokens||[]).join(' ')].join(' ');
  const whole=(concept.wholeTerms||[]).reduce((n,t)=>n+wholePhraseCount(text,t),0);
  const related=(concept.terms||[]).filter(t=>!(concept.wholeTerms||[]).includes(t));
  const rel=related.length?recTextEvidence(rec,related,{history:false}):{score:0,distinct:0,titleHits:0,introHits:0};
  const ok=whole>0 || rel.titleHits>0 || rel.introHits>0 || (rel.distinct>=2&&rel.score>=3.2);
  return {ok,ev:{...ev,wholeHits:whole}};
 }
 // 직접 명시한 좁은 개념은 제목/소개를 우선하고, 목차는 보조 근거로 인정한다.
 const strong = ev.titleHits>0 || ev.introHits>0 || (ev.distinct>=2 && ev.score>=3.2) || ev.score>=5.5;
 return {ok:strong,ev};
}

function emotionMatch(rec,e){
 if(e==='위로·회복'){
  const ev=recTextEvidence(rec,['힐링','위로','회복','치유','위안','따뜻','포근','잔잔','희망','용기','다시 시작','새로운 시작','마음을 어루만','마음을 보듬']);
  return (rec.emotions||[]).includes(e) || ev.titleHits>0 || ev.introHits>0 || (ev.distinct>=2&&ev.score>=5);
 }
 return (rec.emotions||[]).includes(e);
}

function focusMatch(rec,f){
 const ev=recTextEvidence(rec,f.terms||[],{history:false});
 if(f.kind==='healing'){
  const primary=recTextEvidence(rec,['힐링','위로','회복','치유','위안','희망','다시 시작','새로운 시작','마음을 어루만','마음을 보듬','상처를 보듬','일상의 회복']);
  const warm=recTextEvidence(rec,['따뜻','포근','잔잔','용기','성장','관계','가족','친구','일상']);
  const stored=(rec.emotions||[]).includes('위로·회복');
  const ok=primary.titleHits>0||primary.introHits>0||(stored&&(warm.introHits>0||warm.titleHits>0))||(warm.introHits>=2&&warm.distinct>=2);
  return {ok,ev:{...ev,score:ev.score+primary.score*.7+warm.score*.25}};
 }
 if(f.kind==='school-setting'){
  const place=recTextEvidence(rec,['학교','고등학교','교실','교내','학교생활','학창시절','등교','전학','전학생','반 친구']);
  const people=recTextEvidence(rec,['학생','선생님','교사','동급생','친구']);
  const ok=place.titleHits>0||place.introHits>0||(place.distinct>=2&&place.score>=5)||(people.introHits>=2&&people.distinct>=2&&place.distinct>=1);
  return {ok,ev:{...ev,score:ev.score+place.score*.8}};
 }
 if(f.major){
  const core=recTextEvidence(rec,f.coreTerms||f.terms,{history:false});
  const ok=core.titleHits>0||core.introHits>0||(core.distinct>=2&&core.score>=3.2);
  return {ok,ev:core};
 }
 if(f.strict){const ok=ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=7;return {ok,ev};}
 if(f.semantic){const ok=ev.titleHits+ev.introHits>0||ev.distinct>=2||ev.score>=3;return {ok,ev};}
 return {ok:true,ev};
}

function explicitGenreMatch(rec,g){
 // 사용자가 장르를 직접 말했을 때는 잘못 생성된 태그 하나만으로 통과시키지 않는다.
 if(g==='로맨스'){
  const direct=recTextEvidence(rec,['로맨스','연애소설','연애 소설','러브스토리','러브 스토리','로맨틱','연애','첫사랑','짝사랑','사랑 이야기','사랑이야기']);
  const relationship=recTextEvidence(rec,['사랑','연인','연애','첫사랑','짝사랑','키스','데이트','결혼','로맨스']);
  const otherDominant=recTextEvidence(rec,['무협','무림','강호','무공','검객','협객','사조삼부곡','대하소설','전쟁','전투']);
  const explicit=direct.titleHits>0||direct.introHits>0;
  // 다른 장르가 중심으로 명확히 드러나면 단순한 사랑 요소만으로 로맨스로 분류하지 않는다.
  if(!explicit && (otherDominant.titleHits>0||otherDominant.introHits>=2))return false;
  return explicit || relationship.titleHits>0 || relationship.introHits>=3 || (relationship.introHits>=2&&relationship.distinct>=2);
 }
 // 다른 장르는 현재 잘 작동하는 결과를 보존한다. 저장된 장르 태그를 기본 근거로 사용한다.
 return (rec.genres||[]).includes(g);
}

export function scoreRecord(rec,intent){
 const qn=norm(intent.query),titleN=norm(rec.title),authorN=norm(rec.author);let score=0;const reasons=[];
 if(titleN&&qn.includes(titleN)){score+=22;reasons.push('제목 일치');}if(authorN&&qn.includes(authorN)){score+=intent.wantsAuthor?18:4;reasons.push('저자 일치');}
 if(intent.material.length&&!intent.material.every(m=>materialMatch(rec,m)))return null;
 if(intent.classicKorean){if(!isKoreanClassic(rec))return null;}else if(intent.origin&&recOriginScore(rec,intent.origin)<3)return null;
 if(intent.genres.length&&!intent.genres.every(g=>explicitGenreMatch(rec,g)))return null;
 if(intent.emotions.length&&!intent.emotions.every(e=>emotionMatch(rec,e)))return null;
 if(intent.philosophyTradition&&!philosophyMatch(rec,intent.philosophyTradition))return null;
 if(intent.classicRequired){if(intent.classicTarget==='소설'&&!materialMatch(rec,'소설'))return null;if(intent.classicTarget==='문학'&&!isLiterary(rec))return null;if(!intent.classicTarget&&!isLiterary(rec))return null;if(rec.classicMeta)return null;const minClassic=intent.classicKorean?0.8:((intent.origin==='한국'&&intent.classicTarget==='문학')?1.5:2.2);if(classicScore(rec)<minClassic&&!intent.classicKorean)return null;if(intent.classicKorean&&!isKoreanClassic(rec))return null;score+=13+Math.min(7,Math.max(classicScore(rec),intent.classicKorean?2:0));reasons.push(intent.classicTarget==='소설'?'고전 소설 작품':(intent.classicKorean?'한국 고전 문학 작품':'고전 문학 작품'));}

 // 'A와 B', 'A과 B'처럼 두 개념을 직접 연결한 검색은 둘 다 실제 근거가 있어야 한다.
 for(const c of intent.explicitConcepts||[]){const m=explicitConceptMatch(rec,c);if((intent.compoundConcepts||c.required)&&!m.ok)return null;if(m.ok){score+=Math.min(14,5+m.ev.score);reasons.push(c.name);}}

 // 사용자가 직접 쓴 구체명(연산군, 프랑스 등)은 제목·소개·목차 중 실제 근거가 있어야 한다.
 const hist=isHistoryQuery(intent);
 for(const term of intent.requiredTerms||[]){const ev=recTextEvidence(rec,[term],{history:hist});if(ev.titleHits+ev.introHits+ev.tocHits===0)return null;score+=Math.min(13,4+ev.score);reasons.push(term);}

 for(const t of intent.topics){const ev=recTextEvidence(rec,topicTerms(t),{history:t==='역사'});const strict=!intent.majorIntent&&/관련|관한|주제|문제|대해/.test(intent.query);if(strict&&!(ev.titleHits>0||ev.introHits>=2||ev.distinct>=2||ev.score>=7))return null;if(ev.titleHits>0){score+=13;reasons.push(t);}else if(ev.score>=7){score+=9;reasons.push(t);}else if(ev.score>=3){score+=3;}}
 for(const f of intent.focus||[]){const m=focusMatch(rec,f);if(!m.ok)return null;const ev=m.ev||{score:0};if(f.major)score+=Math.min(20,8+ev.score);else if(f.semantic)score+=Math.min(17,5+ev.score);else score+=Math.min(15,5+ev.score);reasons.push(f.name);}
 if(intent.philosophyTradition){score+=14;reasons.push(intent.philosophyTradition);}for(const g of intent.genres){score+=10;reasons.push(g);}for(const m of intent.material){score+=8;reasons.push(m);}for(const e of intent.emotions){score+=10;reasons.push(e);}if(intent.origin){score+=12;reasons.push(`${intent.origin} 문학`);}

 // 학과·진로 질문에서 로컬 전공군에 없는 표현도 Gemini의 의미어로 후보를 찾을 수 있게 한다.
 // 책마다 AI를 호출하지 않으며, 질문 해석 1회의 결과만 기존 인덱스와 비교한다.
 if(intent.majorIntent && !(intent.focus||[]).length && (intent.softKeywords||[]).length){
  const mev=recTextEvidence(rec,intent.softKeywords,{history:false});
  if(mev.titleHits>0||mev.introHits>0||mev.distinct>=2||mev.score>=4){score+=Math.min(16,6+mev.score);reasons.push('전공 연계');}
 }

 // AI가 보태는 의미어는 절대로 필수조건이 되지 않고 순위만 보정한다.
 for(const t of intent.softTopics||[]){const ev=recTextEvidence(rec,topicTerms(t));if(ev.score>=4)score+=Math.min(4,ev.score/2);}
 for(const t of intent.softKeywords||[]){const ev=recTextEvidence(rec,[t],{history:hist});if(ev.score>0)score+=Math.min(3,ev.score/3);}

 const searchN=ntext(rec.title,rec.author,rec.publisher,(rec.keywords||[]).join(' '),(rec.tocTokens||[]).join(' '));let tokenMatches=0;for(const t of intent.tokens){if(searchN.includes(norm(t))){score+=.35;tokenMatches++;}}
 const constrained=intent.topics.length||intent.genres.length||intent.emotions.length||intent.origin||intent.classicRequired||intent.focus.length||intent.material.length||intent.philosophyTradition||(intent.requiredTerms||[]).length||(intent.explicitConcepts||[]).length;
 const min=constrained?12:Math.max(5,Math.min(10,2+intent.tokens.length));if(score<min)return null;if(!constrained&&!titleN.includes(qn)&&!authorN.includes(qn)&&tokenMatches===0)return null;
 return {score,reasons:uniq(reasons).slice(0,4)};
}

export function auditRecordAgainstIntent(rec,intent){
 const problems=[];if(intent.material.length&&!intent.material.every(m=>materialMatch(rec,m)))problems.push('자료형');if(intent.classicKorean&&!isKoreanClassic(rec))problems.push('한국고전근거');else if(intent.origin&&recOriginScore(rec,intent.origin)<3)problems.push('문학권');if(intent.philosophyTradition&&!philosophyMatch(rec,intent.philosophyTradition))problems.push('철학권역');if(intent.classicRequired){const minClassic=intent.classicKorean?0.8:((intent.origin==='한국'&&intent.classicTarget==='문학')?1.5:2.2);if(classicScore(rec)<minClassic&&!intent.classicKorean)problems.push('고전근거');if(intent.classicTarget==='소설'&&!materialMatch(rec,'소설'))problems.push('고전자료형');if(intent.classicTarget==='문학'&&!isLiterary(rec))problems.push('고전자료형');}for(const t of intent.requiredTerms||[]){const ev=recTextEvidence(rec,[t],{history:isHistoryQuery(intent)});if(ev.titleHits+ev.introHits+ev.tocHits===0)problems.push(`필수어:${t}`);}for(const c of intent.explicitConcepts||[]){if((intent.compoundConcepts||c.required)&&!explicitConceptMatch(rec,c).ok)problems.push(`${c.required?'필수개념':'복합개념'}:${c.name}`);}return problems;
}
