const STOP = new Set('그리고 그러나 하지만 또는 대한 관련 관한 위한 통해 있는 없는 하는 되는 되어 이 그 저 것 수 등 및 책 도서 내용 이야기 사람 우리 내가 너가 매우 정말 그냥 조금 다시 더 가장 이런 저런 어떤 한 에서 으로 로서 에게 에는 이는 은 는 이 가 을 를 의 과 와 도 에 로 으로부터'.split(/\s+/));

export function cleanText(v){return String(v??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
export function norm(v){return cleanText(v).toLowerCase().replace(/[\s\-_/·:;,.!?()[\]{}'"“”‘’]+/g,'');}
export function tokenize(v){
  const m=cleanText(v).toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}|\d{2,}/g)||[];
  return m.filter(x=>!STOP.has(x));
}
function uniq(a){return [...new Set(a.filter(Boolean))];}

const TOPICS = [
 ['환경·기후',['환경','기후','기후변화','지구온난화','탄소','생태','생태계','플라스틱','오염','재활용','자원순환','멸종','자연보호','에너지전환','환경문제']],
 ['인공지능·정보',['인공지능','ai','알고리즘','정보기술','정보사회','디지털','데이터','컴퓨터','코딩','프로그래밍','소프트웨어','로봇','머신러닝','딥러닝']],
 ['수학',['수학','수학자','기하','확률','통계','함수','미적분','대수','숫자','수리']],
 ['과학',['과학','과학자','물리','화학','생물','생명과학','천문','우주','지구과학','실험','분자','양자']],
 ['의학·약학',['의학','의료','의사','질병','약학','약사','신약','신약개발','의약품','치료','바이오','생명공학','유전','면역']],
 ['건축·도시',['건축','건축가','도시','도시설계','공간','주거','집','건물','인테리어','토목']],
 ['역사',['역사','한국사','세계사','근현대사','고대','중세','전쟁','왕조','식민지','독립운동']],
 ['철학·윤리',['철학','윤리','도덕','정의','행복','자유','존재','삶의의미','인문학']],
 ['사회·정치',['사회','정치','민주주의','법','경제','불평등','노동','인권','차별','혐오','젠더','미디어','교육']],
 ['심리·감정',['심리','마음','감정','불안','우울','상실','슬픔','위로','회복','관계','외로움','자존감']],
 ['진로·직업',['진로','직업','취업','직업인','커리어','꿈','전공','학과']],
 ['예술·디자인',['예술','미술','디자인','음악','영화','사진','그림','회화','공예']],
 ['문학·글쓰기',['문학','소설','시','에세이','작가','글쓰기','문장','서사','독서']],
 ['여행·지리',['여행','지리','세계여행','도시여행','국가','지역','지도']],
 ['경제·경영',['경제','경영','기업','마케팅','투자','금융','돈','시장','창업']],
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

function containsAny(text, terms){ const n=norm(text); return terms.some(t=>n.includes(norm(t))); }
function kdcType(kdc){
  const x=String(kdc||'');
  if(/^8\d3/.test(x)) return '소설';
  if(/^8\d1/.test(x)) return '시';
  if(/^8\d4/.test(x)||/^818/.test(x)) return '에세이';
  if(/^8/.test(x)) return '문학';
  return '비문학';
}
export function deriveProfile(book, meta={}){
  const title=cleanText(book?.identity?.title), author=cleanText(book?.identity?.author), intro=cleanText(meta.introduction), toc=cleanText(meta.toc);
  const text=[title,author,book?.identity?.publisher,intro,toc].filter(Boolean).join(' ');
  const materialType=kdcType(book?.holding?.kdc);
  const topics=TOPICS.filter(([,terms])=>containsAny(text,terms)).map(([name])=>name);
  const genres=GENRES.filter(([,terms])=>containsAny(text,terms)).map(([name])=>name);
  if(materialType==='소설'&&!genres.includes('소설')) genres.unshift('소설');
  if(materialType==='시') genres.unshift('시');
  if(materialType==='에세이') genres.unshift('에세이');

  const weighted=[];
  for(const t of tokenize(title)) weighted.push(t,t,t);
  for(const t of tokenize(author)) weighted.push(t,t);
  for(const t of tokenize(intro)) weighted.push(t);
  for(const t of tokenize(toc).slice(0,300)) weighted.push(t);
  const counts=new Map(); for(const t of weighted) counts.set(t,(counts.get(t)||0)+1);
  const keywords=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,55).map(x=>x[0]);

  const emotions=[];
  for(const [name,terms] of [['슬픔·상실',['슬픔','상실','죽음','애도','이별']],['위로·회복',['위로','회복','치유','희망']],['긴장·공포',['긴장','공포','불안','위기']],['유머·경쾌',['유머','웃음','코믹','재미']],['반전',['반전','뜻밖','충격적 결말']]]) if(containsAny(text,terms)) emotions.push(name);
  return {materialType,genres:uniq(genres),topics:uniq(topics),emotions:uniq(emotions),keywords};
}

export function interpretLocal(query){
  const q=cleanText(query), nq=norm(q), tokens=tokenize(q);
  const material=[];
  if(/소설/.test(q)) material.push('소설');
  if(/(^|\s)시($|\s)|시집|시를/.test(q)) material.push('시');
  if(/에세이|수필/.test(q)) material.push('에세이');
  const genres=[];
  for(const [name,terms] of GENRES) if(terms.some(t=>nq.includes(norm(t)))) genres.push(name);
  const topics=[];
  for(const [name,terms] of TOPICS) if(terms.some(t=>nq.includes(norm(t)))) topics.push(name);
  const wantsAuthor=/작가|저자|소설가|시인/.test(q);
  const complex=/진로|수행평가|탐구|관심|연결|하지만|싫어|재미있|추천|관련/.test(q)||tokens.length>=5;
  return {query:q,tokens,material:uniq(material),genres:uniq(genres),topics:uniq(topics),wantsAuthor,complex};
}

export function scoreRecord(rec,intent){
  const qn=norm(intent.query), titleN=norm(rec.title), authorN=norm(rec.author);
  let score=0; const reasons=[];
  if(titleN&&qn.includes(titleN)){score+=18;reasons.push('제목 일치');}
  if(authorN&&qn.includes(authorN)){score+=intent.wantsAuthor?18:8;reasons.push('저자 일치');}
  const searchN=norm([rec.title,rec.author,rec.publisher,(rec.keywords||[]).join(' '),(rec.topics||[]).join(' '),(rec.genres||[]).join(' ')].join(' '));
  let tokenHits=0; for(const t of intent.tokens){if(searchN.includes(norm(t))){score+=2.2;tokenHits++;}}
  for(const t of intent.topics){if((rec.topics||[]).includes(t)){score+=9;reasons.push(t);} }
  for(const g of intent.genres){if((rec.genres||[]).includes(g)){score+=10;reasons.push(g);} }
  for(const m of intent.material){if(rec.materialType===m||(rec.genres||[]).includes(m)){score+=8;reasons.push(m);}else score-=18;}
  // explicit genre/material constraints are mandatory.
  if(intent.material.length&&!intent.material.some(m=>rec.materialType===m||(rec.genres||[]).includes(m))) return null;
  if(intent.genres.length&&!intent.genres.every(g=>(rec.genres||[]).includes(g))) return null;
  // explicit topic + 관련/관한/주제 means at least one topic must be evidenced.
  if(intent.topics.length&&/관련|관한|주제|문제|대해/.test(intent.query)&&!intent.topics.some(t=>(rec.topics||[]).includes(t))) return null;
  if(score<2.5) return null;
  return {score,reasons:uniq(reasons).slice(0,3),tokenHits};
}
