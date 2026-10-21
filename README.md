# Post-it Todo List

202202056 이강민 · AI 코딩을 활용한 창의적 앱 개발

작은 생각과 할 일을 붙여두는 Next.js 포스트잇 보드입니다. Google Sheets에 메모를 저장합니다.

배포 주소: https://posit-pi.vercel.app/

## 기능

- 메모 작성, 편집, 삭제 및 완료 표시
- 네 가지 무작위 파스텔 색상과 메모 부착 애니메이션
- 전체 / 할 일 / 아이디어 / 기타 필터
- 최대 4열의 반응형 레이아웃과 라이트 / 다크 모드
- 마우스·터치 손잡이 드래그와 좌우 방향키 순서 변경
- 한국어 작성 날짜, 시간, 요일 표시
- Google Sheets CRUD 및 순서 영속 저장

## 로컬 실행

Node.js 22 이상을 사용합니다.

```sh
npm ci
```

`.env.example`을 `.env.local`로 복사한 후 Google Sheets 연결 정보를 입력합니다.

```sh
npm run dev
```

기본 주소는 http://localhost:3000 입니다. `npm run dev -- --port 3100`으로 포트를 지정할 수 있습니다.

## Google Sheets 연결

1. Google Cloud에서 Google Sheets API를 활성화하고 서비스 계정을 만듭니다.
2. 서비스 계정 JSON의 `client_email`과 `private_key`를 서버 환경변수 `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`에 지정합니다.
3. 본인의 시트를 서비스 계정 이메일에 편집자로 공유합니다.
4. 시트 URL의 `/d/` 뒤 ID를 `GOOGLE_SHEET_ID`에 지정합니다.
5. 첫 탭을 사용합니다. 다른 탭은 `GOOGLE_SHEET_TAB`으로 지정합니다.

첫 행 A:G는 `timestamp`, `datetime`, `category`, `content`, `color`, `state`, `order` 순서입니다. 빈 시트의 첫 메모를 생성하면 헤더를 자동으로 추가합니다. 다른 헤더가 있는 시트는 덮어쓰지 않습니다. 생성 날짜는 ISO 8601 문자열로 저장합니다.

비밀키와 `.env.local`은 Git에 포함하지 않습니다. 이 앱은 하나의 시트를 함께 사용하는 과제용 보드로, 배포 주소를 아는 사용자는 메모를 편집할 수 있습니다.

## 검사

```sh
npm run lint
npm run build
```

## Vercel 배포

1. https://vercel.com/new 에서 `kangmin5820/posit` 저장소를 선택합니다.
2. 프레임워크는 Next.js, Root Directory는 저장소 루트(`.`)로 지정합니다.
3. Node.js 버전은 22 이상으로 설정합니다.
4. 위 Google 환경변수 세 가지를 Production 환경에 추가합니다. 필요하면 `GOOGLE_SHEET_TAB`도 설정합니다.
5. Deploy를 실행합니다. 비밀키의 줄바꿈은 실제 줄바꿈 또는 `\n` 형태 모두 지원합니다.

## 제출

- 학번 / 이름: 202202056 이강민
- GitHub: https://github.com/kangmin5820/posit
- 개발 단계 및 검증: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Vercel: https://posit-pi.vercel.app/

이메일 제목: `[AI코딩] 202202056 이강민`
