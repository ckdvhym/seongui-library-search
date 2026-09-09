// Vercel Serverless Function: Gemini query interpreter
// Environment variable required: GEMINI_API_KEY
const MODEL = "gemini-2.5-flash-lite";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ok:false,error:"POST only"});
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ok:false,error:"GEMINI_API_KEY is not configured"});
  const q = String(req.body?.query || "").trim();
  if (!q || q.length > 300) return res.status(400).json({ok:false,error:"Invalid query"});

  const schema = {
    type:"OBJECT",
    properties:{
      understood:{type:"BOOLEAN"},
      intent:{type:"STRING", enum:["topic","career","assignment","casual","author","title","mixed"]},
      title_query:{type:"STRING"},
      author_query:{type:"STRING"},
      material_types:{type:"ARRAY",items:{type:"STRING"}},
      genres:{type:"ARRAY",items:{type:"STRING"}},
      primary_topics:{type:"ARRAY",items:{type:"STRING"}},
      related_topics:{type:"ARRAY",items:{type:"STRING"}},
      curriculum_fields:{type:"ARRAY",items:{type:"STRING"}},
      career_fields:{type:"ARRAY",items:{type:"STRING"}},
      emotions_tone:{type:"ARRAY",items:{type:"STRING"}},
      audience:{type:"ARRAY",items:{type:"STRING"}},
      exclusions:{type:"ARRAY",items:{type:"STRING"}},
      required_groups:{
        type:"ARRAY",
        items:{
          type:"OBJECT",
          properties:{
            label:{type:"STRING"},
            terms:{type:"ARRAY",items:{type:"STRING"}},
            axis:{type:"STRING", enum:["topic","material","genre","career","curriculum","emotion","author","title","audience"]}
          },
          required:["label","terms","axis"]
        }
      },
      explanation:{type:"STRING"}
    },
    required:["understood","intent","title_query","author_query","material_types","genres","primary_topics","related_topics","curriculum_fields","career_fields","emotions_tone","audience","exclusions","required_groups","explanation"]
  };

  const system = `너는 고등학교 도서관의 자연어 검색어 해석기다.
사용자가 찾는 책의 조건을 구조화하라. 책을 추천하거나 존재하지 않는 책을 만들지 마라.
핵심 원칙:
1) 사용자가 여러 조건을 말하면 각각을 required_groups로 분리하고 AND 조건으로 유지한다.
2) '슬픈 시' = material 시 + emotion 슬픔. '환경 관련 소설' = material 소설 + topic 환경.
3) '건축 진로인데 정보와 연결'에서 '정보'는 문맥상 정보기술/디지털/BIM/스마트건축 등과 연결하되 건축과 정보기술을 각각 필수 그룹으로 둔다.
4) '신약 개발'은 약학·제약·의약품·약물개발·바이오·생명과학·화학 등으로 확장하되 신약개발 맥락을 유지한다.
5) '자기 계발'과 '자기 개발'은 일반적으로 자기계발/습관/동기부여/생산성/자기관리 장르로 해석한다.
6) '시'는 poetry, '에세이'는 essay, '소설'은 fiction으로 material_types에 넣는다.
7) 수학/과학/역사/철학/사회 같은 교과 단일어도 반드시 이해한다.
8) '플라스틱'은 문맥에 따라 물질/환경 문제와 성형수술을 구분한다. 재난은 자동으로 환경이 아니다.
9) 제목·저자 검색은 명시적인 표현일 때만 title_query/author_query를 사용한다.
10) required_groups.terms에는 실제 검색 비교에 쓸 수 있도록 동의어·상하위 개념을 3~10개 정도 넣되 지나치게 넓히지 마라.
한국어로 간결하게 반환하라.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const r = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:system}]},
        contents:[{role:"user",parts:[{text:q}]}],
        generationConfig:{
          responseMimeType:"application/json",
          responseSchema:schema,
          temperature:0.1,
          maxOutputTokens:1400
        }
      })
    });
    const raw = await r.json();
    if (!r.ok) return res.status(r.status).json({ok:false,error:"Gemini request failed",detail:raw});
    const text = raw?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("") || "";
    const parsed = JSON.parse(text);
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({ok:true,model:MODEL,analysis:parsed});
  } catch (e) {
    return res.status(500).json({ok:false,error:String(e?.message||e)});
  }
}
