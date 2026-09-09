const MODEL = "gemini-3.1-flash-lite";

async function callGemini(key, body) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {"Content-Type":"application/json", "x-goog-api-key":key},
    body: JSON.stringify(body)
  });
  let raw={}; try { raw=await r.json(); } catch {}
  return {r,raw};
}

const schema = {
  type:"object",
  properties:{profiles:{type:"array",items:{type:"object",properties:{
    id:{type:"integer"},
    material_type:{type:"string",enum:["fiction","poetry","essay","nonfiction","comics","picturebook","reference","other"]},
    genres:{type:"array",items:{type:"string"}},
    primary_topics:{type:"array",items:{type:"string"}},
    secondary_topics:{type:"array",items:{type:"string"}},
    emotions:{type:"array",items:{type:"object",properties:{name:{type:"string"},strength:{type:"string",enum:["primary","secondary"]}},required:["name","strength"]}},
    curriculum_fields:{type:"array",items:{type:"string"}},
    career_fields:{type:"array",items:{type:"string"}},
    literature_origin:{type:"array",items:{type:"string"}},
    setting_places:{type:"array",items:{type:"string"}},
    time_periods:{type:"array",items:{type:"string"}},
    audience:{type:"array",items:{type:"string"}},
    difficulty:{type:"string",enum:["easy","medium","challenging","unknown"]},
    search_terms:{type:"array",items:{type:"string"}},
    exclusions:{type:"array",items:{type:"string"}},
    evidence:{type:"string"},
    confidence:{type:"integer",minimum:0,maximum:100}
  },required:["id","material_type","genres","primary_topics","secondary_topics","emotions","curriculum_fields","career_fields","literature_origin","setting_places","time_periods","audience","difficulty","search_terms","exclusions","evidence","confidence"]}}},
  required:["profiles"]
};

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"POST only"});
  const key=process.env.GEMINI_API_KEY;
  if(!key) return res.status(503).json({ok:false,error:"GEMINI_API_KEY missing"});
  const books=Array.isArray(req.body?.books)?req.body.books.slice(0,8):[];
  if(!books.length) return res.status(400).json({ok:false,error:"books required"});

  const compact=books.map(x=>({
    id:Number(x.id), title:String(x.title||"").slice(0,180), author:String(x.author||"").slice(0,180),
    publisher:String(x.publisher||"").slice(0,120), year:String(x.year||"").slice(0,12), isbn:String(x.isbn||"").slice(0,20),
    kdc:String(x.kdc||"").slice(0,10), introduction:String(x.introduction||"").slice(0,3500),
    toc:String(x.toc||"").slice(0,2500), summary:String(x.summary||"").slice(0,2000)
  }));

  const system=`너는 고등학교 학교도서관의 도서 의미프로필 구축 담당자다. 제공된 서지정보, KDC, 공식 책소개와 목차만 근거로 각 책의 검색용 프로필을 만든다. 추측보다 보수적 판정을 우선한다.

핵심 규칙:
1. material_type은 작품의 실제 자료형이다. 소설 fiction, 시집 poetry, 에세이 essay, 일반 교양/정보서는 nonfiction으로 구분한다. KDC는 보조근거이지 단독근거가 아니다.
2. genres는 실제 장르만 기록한다. '사랑/관계가 등장'한다는 이유로 로맨스를 붙이지 않는다. 로맨스는 연애/사랑이 서사의 중심 장르일 때만. 추리/미스터리/SF/판타지/역사소설도 같은 원칙이다.
3. primary_topics는 책 전체를 설명하는 핵심 주제만 2~6개, secondary_topics는 의미 있는 부주제만 0~8개로 제한한다. 단순 배경/한 장면은 주제로 승격하지 않는다.
4. 환경은 기후위기, 생태, 환경오염, 지속가능성 등 환경 자체가 핵심일 때만 주제로 기록한다. 재난·미래·생물학 일반을 환경으로 자동 확장하지 않는다.
5. emotions는 독자가 느낄 수 있는 모든 감정이 아니라 작품의 중심 정서만 기록한다. primary는 작품 전반의 지배적 정서, secondary는 분명하지만 중심은 아닌 정서다.
6. curriculum_fields는 고교 교과 연결이 명확할 때만(국어/문학, 수학, 과학, 사회, 역사, 윤리, 정보, 기술가정, 예술 등). career_fields도 실제 직업·학문·산업 연결이 명확할 때만.
7. literature_origin은 문학작품의 원저자/원작 기준 국가·권역을 기록한다(예: 한국, 일본, 프랑스, 영미권). 번역자의 국적은 무시한다. 비문학도 저자/내용상 국적 검색이 유용할 때만 기록한다.
8. search_terms는 학생이 자연어로 찾을 법한 동의어·관련개념을 3~12개만 넣되 책의 실제 내용 범위를 넘지 않는다.
9. exclusions에는 제목이나 표면 단어 때문에 오해하기 쉬운 주제를 명시한다. 예: 성형수술의 '플라스틱'이면 '환경 아님'; 재난소설이지만 환경문제가 핵심이 아니면 '환경 핵심 아님'. 필요 없으면 빈 배열.
10. 책소개/목차가 없고 서지정보만 있으면 confidence를 낮춘다. 모르면 빈 배열을 사용하고 만들어내지 않는다.
11. evidence는 왜 이 프로필이 붙었는지 1문장, 최대 160자. 마케팅 문구를 복사하지 말고 요약한다.
12. 모든 입력 책에 정확히 하나의 profile을 반환하고 id를 그대로 유지한다.`;

  try{
    const {r,raw}=await callGemini(key,{
      systemInstruction:{parts:[{text:system}]},
      contents:[{role:"user",parts:[{text:JSON.stringify({books:compact})}]}],
      generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:0,maxOutputTokens:7000}
    });
    if(!r.ok) return res.status(r.status).json({ok:false,error:raw?.error?.message||`Gemini HTTP ${r.status}`,status:raw?.error?.status||null});
    const text=raw?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    const parsed=JSON.parse(text);
    return res.status(200).json({ok:true,model:MODEL,profiles:parsed.profiles||[]});
  }catch(e){ return res.status(500).json({ok:false,error:String(e?.message||e)}); }
}
