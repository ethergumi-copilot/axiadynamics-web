# axiadynamics.com — AXIA Dynamics 회사 홈페이지

악시아 다이내믹스(AXIA Dynamics) 회사 · 제품(AXIA MX™) 소개 한 장. 정적 파일만(빌드 도구 · 프레임워크 없음) · GitHub Pages 무료 호스팅.

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 한 장 전체 — 첫 화면 · 사실 띠 · 회사 · 제품 · AI 원칙 · 문의 · 바닥 · 공유 미리보기 메타 · JSON-LD |
| `assets/site.css` | 색 · 서체(브랜드 CI v1 `axia-tokens.css` 의 짙은 바탕 값) · 레이아웃 · 반응형 |
| `assets/hero.js` | 첫 화면 캔버스 — 3D 공작물 위 공구 경로 시뮬레이션 + 좌표 HUD (의존성 없음) |
| `assets/site.js` | 스크롤 등장 · 상단 바 · 카드 빛 · 메일 주소 복사 |
| `assets/logo/` · `assets/icon*` · `favicon.ico` · `apple-touch-icon.png` | 브랜드 CI v1 에서 복사(디자이너 v2 가 오면 같은 이름으로 바꾼다) |
| `og.png` | 카카오톡 · 메신저 공유 미리보기(1200×630) — 원본 `tools/og.html` |
| `CNAME` | GitHub Pages 사용자 도메인(`axiadynamics.com`) |
| `404.html` · `robots.txt` · `sitemap.xml` · `.nojekyll` | 없는 주소 안내 · 검색 로봇 · Jekyll 끄기 |

## 자주 고치는 것

- **문의 메일 주소** — `index.html` 에서 `yhjung@axiadynamics.com` 을 찾아 모두 바꾼다(JSON-LD `email` · `mailto:` 두 곳 · 화면 글자 · 복사 단추 `data-mail` · 다섯 군데).
- **글** — `index.html` 에서 바로. 글의 근거 = 브랜드 기본안(MES 저장소 `MCT_MES 설계/02_사업전략/AXIA_Dynamics_브랜드_기본안_v1_20261018.md`). 확인되지 않은 기능 · 숫자 · 고객 이름은 쓰지 않는다.
- **표기 규칙** — 제품은 늘 `AXIA MX`(AXIA 단독 ❌) · 상표 등록 전에는 ™ 만(® ❌) · 한글 회사명 '악시아 다이내믹스'.
- **법인 등기 뒤** — 바닥(`<footer>`)에 상호 · 대표자 · 사업자등록번호 · 주소 줄을 더한다.

## 미리 보기

```bash
python -m http.server 8765
```

브라우저로 `http://localhost:8765` (파일을 바로 열어도 되지만 글꼴 · 경로는 서버로 보는 것이 정확하다).

## 올리기(배포)

`main` 에 push 하면 1~2분 뒤 https://axiadynamics.com 에 반영된다(GitHub Pages · 저장소 Settings › Pages = `main` / 루트). 반영 뒤 폰에서 안 바뀌어 보이면 새로고침.

## 도메인 · DNS (가비아)

My가비아 › DNS 관리 › `axiadynamics.com` 에 아래 줄이 있어야 한다. **MX · TXT(SPF) 등 네이버웍스 메일 줄은 건드리지 않는다.**

| 타입 | 호스트 | 값 |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA (선택) | `@` | `2606:50c0:8000::153` · `2606:50c0:8001::153` · `2606:50c0:8002::153` · `2606:50c0:8003::153` |
| CNAME | `www` | `ethergumi-copilot.github.io.` |
| TXT (도메인 확인) | `_github-pages-challenge-ethergumi-copilot` | GitHub › Settings › Pages › Add a domain 에서 받은 값 |

DNS 가 반영되면 저장소 Settings › Pages 에서 **Enforce HTTPS** 를 켠다.

## 공유 그림(og.png) 다시 만들기

미리 보기 서버를 띄운 채(PowerShell):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=6000 --user-data-dir="$env:TEMP\og-edge" --screenshot="$PWD\og.png" http://localhost:8765/tools/og.html
```

Edge 가 뒤에서 파일을 쓰므로 몇 초 뒤 `og.png` 가 바뀐다. 카카오톡은 미리보기를 캐시하므로 바꾼 뒤에는 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 지운다.
