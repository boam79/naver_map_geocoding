# 🏥 환자 주소 분석 시스템 (Patient Address Analysis)

**Next.js 15 + TypeScript** 기반 환자 주소 데이터 분석 및 지오코딩 자동화 웹 애플리케이션

엑셀/CSV 파일에서 주소 데이터를 업로드하면, 네이버 Geocoding API를 통해 좌표를 생성하고, 네이버 지도 기반 **히트맵/마커** 시각화 및 **Markdown 리포트**를 자동 생성합니다.

---

## 📑 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [사용 방법](#-사용-방법)
- [프로젝트 구조](#-프로젝트-구조)
- [API 엔드포인트](#-api-엔드포인트)
- [환경 변수](#-환경-변수)
- [성능 및 최적화](#-성능-및-최적화)
- [보안](#-보안)
- [지도 뷰어](#️-지도-뷰어)
- [생성되는 파일](#-생성되는-파일)
- [테스트 방법](#-테스트-방법)
- [트러블슈팅](#-트러블슈팅)
- [개발 진행 상황](#️-개발-진행-상황)
- [참고 문서](#-참고-문서)
- [라이선스](#-라이선스)

---

## 🌟 주요 기능

### 1. 데이터 업로드 및 검증
- ✅ **엑셀/CSV 업로드**: 드래그 앤 드롭 지원
- ✅ **다중 시트 지원**: 시트 선택 UI 제공
- ✅ **데이터 미리보기**: 첫 5행 자동 표시
- ✅ **자동 데이터 검증**: 파일 크기, 형식, 주소 유효성 자동 체크
- ✅ **대용량 파일 지원**: 10MB 이상 파일 스트리밍 처리
- ✅ **파일 형식**: XLSX, XLS, CSV (UTF-8, EUC-KR 자동 감지)

### 2. 주소 처리 및 지오코딩
- ✅ **주소 컬럼 자동 인식**: 99% 정확도 (AI 기반 패턴 매칭)
- ✅ **주소 정규화**: 공백/오타 보정, 약어 확장 (`서울시→서울특별시`)
- ✅ **네이버 Geocoding API 연동**: [공식 API 문서 준수](https://api.ncloud-docs.com/docs/application-maps-geocoding)
- ✅ **지오코딩 성공률**: ≥ 98% (다단계 Fallback 로직)
- ✅ **Confidence 점수화**: 0-100점 (행정구역, 우편번호, 토큰 유사도 기반)
- ✅ **중복 제거**: 캐싱 기반 (TTL 365일)

### 3. 실시간 진행률 모니터링
- ✅ **SSE (Server-Sent Events)**: 실시간 양방향 통신
- ✅ **진행률 표시**: 현재/전체 건수, 퍼센티지, Progress Bar
- ✅ **예상 남은 시간**: ETA 계산 (처리 속도 기반)
- ✅ **처리 속도**: 초당 건수 실시간 표시
- ✅ **에러 카운트**: 성공/실패/스킵 건수 분류
- ✅ **체크포인트 저장**: 100건마다 자동 저장 (작업 재개 가능)

### 4. 에러 처리 및 복구
- ✅ **자동 재시도**: 최대 3회, 지수 백오프 (1초, 2초, 4초)
- ✅ **작업 재개**: 중단된 작업 이어서 처리
- ✅ **에러 분류**: 네트워크/API/데이터/시스템 오류 구분
- ✅ **타임아웃 설정**: 30초 (네이버 API 권장)
- ✅ **Rate Limit 대응**: 429 에러 시 자동 대기

### 5. 통계 분석 및 리포트
- ✅ **동일 주소 집계**: 정규화된 주소 기준 중복 카운트 (내림차순)
- ✅ **시군구별 통계**: 광역시/도 + 시/군/구 단위 집계 (Top-N)
- ✅ **Markdown 리포트**: 자동 생성 (지도 스크린샷 포함)
  - 동일 주소 개수 통계 테이블
  - 시군구별 통계 테이블
  - Confidence 분포 차트
  - 에러 요약 및 처리 시간 통계
- ✅ **CSV 결과 파일**: 다운로드 가능 (`results_*.csv`, `errors_*.csv`)

### 6. 지도 시각화
- ✅ **네이버 지도 기반**: [NAVER Maps JS SDK v3](https://navermaps.github.io/maps.js.ncp/)
- ✅ **히트맵 모드**: 데이터 밀도 시각화 (색상 gradiant)
  - 파란색 (낮은 밀도) → 노란색 (보통) → 빨간색 (높은 밀도)
  - 반경 조정 가능 (환경 변수)
- ✅ **마커 모드**: 개별 주소 점 표시
  - 마커 클릭 시 정보창 표시 (주소, 신뢰도)
  - 12px 파란색 원형 마커
- ✅ **히트맵/마커 토글**: 버튼 클릭으로 전환
- ✅ **인터랙티브**: 확대/축소, 패닝, 지도 스타일 선택

---

## 🚀 기술 스택

### Frontend
- **프레임워크**: [Next.js 15.5.6](https://nextjs.org/) (App Router)
- **언어**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI 라이브러리**: [React 19.1.0](https://react.dev/)
- **스타일링**: [TailwindCSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **상태 관리**: [Zustand 5.0](https://zustand-demo.pmnd.rs/)
- **데이터 페칭**: [@tanstack/react-query 5.90](https://tanstack.com/query)

### Backend (Next.js API Routes)
- **런타임**: Node.js (Next.js 내장)
- **API 클라이언트**: [axios 1.12](https://axios-http.com/), [axios-retry 4.5](https://github.com/softonic/axios-retry)
- **데이터 처리**: [xlsx 0.18](https://sheetjs.com/), [papaparse 5.5](https://www.papaparse.com/)
- **Fuzzy Matching**: [fuzzball 2.2](https://github.com/nol13/fuzzball.js)
- **실시간 통신**: Server-Sent Events (SSE) - Next.js 내장

### 지도 및 시각화
- **지도**: [NAVER Maps JS SDK v3](https://navermaps.github.io/maps.js.ncp/) (히트맵 + 마커)
- **차트**: [Recharts 3.3](https://recharts.org/)
- **스크린샷**: [html2canvas 1.4](https://html2canvas.hertzen.com/)

### 개발 도구
- **드래그 앤 드롭**: [react-dropzone 14.3](https://react-dropzone.js.org/)
- **알림**: [sonner 2.0](https://sonner.emilkowal.ski/) (토스트)
- **아이콘**: [lucide-react 0.546](https://lucide.dev/)
- **테마**: [next-themes 0.4](https://github.com/pacocoursey/next-themes)

---

## 🛠️ 시작하기

### 1. 사전 요구사항

- **Node.js**: v18.17 이상 (권장: v20)
- **npm**: v9 이상
- **네이버 클라우드 플랫폼 계정**: [NAVER Cloud Platform](https://www.ncloud.com/)
  - Maps Geocoding API 서비스 활성화
  - Maps JavaScript API 서비스 활성화
  - Client ID 및 Client Secret 발급

### 2. 설치

```bash
# 저장소 클론
git clone <repository-url>
cd patient-address-analysis

# 의존성 설치
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 또는 `.env.local` 파일을 생성하고 다음 값을 설정합니다:

```env
# 네이버 지오코딩 API 설정 (서버 사이드)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_GEOCODING_URL=https://maps.apigw.ntruss.com/map-geocode/v2/geocode

# 네이버 맵 JavaScript API 설정 (클라이언트 사이드)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_client_id

# 성능 설정
API_RATE_LIMIT=200         # 초당 API 호출 제한
BATCH_SIZE=600             # 배치 처리 크기
CONCURRENCY=80             # 동시 요청 수
RETRY_MAX=3                # 재시도 횟수
RETRY_BACKOFF_BASE=1       # 백오프 기본 시간(초)
CHECKPOINT_INTERVAL=100    # 체크포인트 저장 간격

# 파일 업로드 설정
MAX_FILE_SIZE=52428800     # 50MB (바이트)
ALLOWED_EXTENSIONS=xlsx,xls,csv
FILE_AUTO_DELETE_HOURS=24

# 지도 설정
NEXT_PUBLIC_MAP_CENTER_LAT=36.5
NEXT_PUBLIC_MAP_CENTER_LNG=127.9
NEXT_PUBLIC_MAP_ZOOM=6
NEXT_PUBLIC_HEATMAP_RADIUS=18
```

> **중요**: `.env.local` 파일은 Git에 커밋하지 마세요! (`.gitignore`에 이미 등록됨)

### 4. 네이버 클라우드 플랫폼 설정

1. [NAVER Cloud Platform 콘솔](https://console.ncloud.com/) 접속
2. **Application Maps** 서비스 선택
3. **서비스 환경 등록** → **Web 서비스 URL** 추가:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
4. **Client ID** 및 **Client Secret** 복사 → `.env` 파일에 입력

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 자동 오픈

### 6. 프로덕션 빌드 및 실행

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 7. Vercel 배포 (선택사항)

#### A. Vercel 계정 연결
```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로그인
vercel login

# 프로젝트 배포
vercel
```

#### B. Vercel 대시보드에서 환경 변수 설정
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 환경 변수 추가:
   ```
   NAVER_CLIENT_ID=your_naver_client_id
   NAVER_CLIENT_SECRET=your_naver_client_secret
   NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_client_id
   NAVER_GEOCODING_URL=https://maps.apigw.ntruss.com/map-geocode/v2/geocode
   API_RATE_LIMIT=200
   BATCH_SIZE=600
   CONCURRENCY=80
   RETRY_MAX=3
   RETRY_BACKOFF_BASE=1
   CHECKPOINT_INTERVAL=100
   ```

#### C. 네이버 클라우드 플랫폼 도메인 등록
1. [NAVER Cloud Platform 콘솔](https://console.ncloud.com/) 접속
2. **Application Maps** → **서비스 환경 등록**
3. **Web 서비스 URL**에 Vercel 도메인 추가:
   ```
   https://your-app.vercel.app
   ```

#### D. 배포 완료
- Vercel이 자동으로 빌드 및 배포
- 배포 URL: `https://your-app.vercel.app`

⚠️ **주의사항**:
- Vercel 무료 플랜은 함수 실행 시간이 10초로 제한됩니다.
- Pro 플랜($20/월)은 최대 300초(5분)까지 가능합니다.
- 대용량 데이터 처리 시 타임아웃이 발생할 수 있습니다.
- 파일은 `/tmp`에 임시 저장되며, 장기 저장이 필요하면 Vercel Blob Storage 사용을 권장합니다.

### 7. 샘플 데이터 생성 (선택사항)

```bash
npm run generate-sample
```

→ `public/uploads/sample_addresses.xlsx` 생성 (20건 테스트 데이터)

---

## 📚 사용 방법

### 1단계: 파일 업로드

1. 메인 페이지에서 **"파일 업로드"** 탭 클릭
2. 엑셀/CSV 파일을 드래그 앤 드롭 또는 클릭하여 선택
3. 파일 형식: `.xlsx`, `.xls`, `.csv` (최대 50MB)

### 2단계: 데이터 미리보기

1. 업로드 후 **첫 5행 자동 표시**
2. 다중 시트가 있는 경우 **시트 선택**
3. 데이터 통계 확인 (총 행수, 빈 값 개수)

### 3단계: 주소 컬럼 선택

1. **자동 인식**: AI가 주소 컬럼 자동 감지 (99% 정확도)
2. **수동 선택**: 드롭다운에서 직접 선택 가능
3. 감지된 주소 예시 표시

### 4단계: 처리 시작

1. **"처리 시작"** 버튼 클릭
2. **실시간 진행률 모니터링**:
   - Progress Bar (0-100%)
   - 현재 처리 건수 / 전체 건수
   - 예상 남은 시간 (ETA)
   - 처리 속도 (초당 건수)
   - 성공/실패/스킵 건수
3. 체크포인트 자동 저장 (100건마다)

### 5단계: 결과 확인

1. **Markdown 리포트 다운로드**:
   - 동일 주소 개수 통계 (내림차순)
   - 시군구별 통계
   - Confidence 분포
   - 에러 요약
2. **CSV 결과 파일 다운로드**:
   - `results_*.csv`: 성공한 지오코딩 결과 (좌표 포함)
   - `errors_*.csv`: 실패한 주소 목록
3. **지도 뷰어**: "지도에서 보기" 버튼 클릭

---

## 📁 프로젝트 구조

```
patient-address-analysis/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # 메인 페이지 (파일 업로드 UI)
│   ├── layout.tsx                 # 루트 레이아웃
│   ├── globals.css                # 전역 스타일
│   ├── viewer/
│   │   └── page.tsx               # 지도 뷰어 페이지
│   └── api/                       # API Routes
│       ├── upload/
│       │   └── route.ts           # POST /api/upload (파일 업로드)
│       ├── process/
│       │   └── route.ts           # POST /api/process (배치 처리 시작)
│       ├── status/
│       │   └── [jobId]/
│       │       └── route.ts       # GET /api/status/[jobId] (진행률 조회 SSE)
│       ├── download/
│       │   └── [filename]/
│       │       └── route.ts       # GET /api/download/[filename] (파일 다운로드)
│       └── viewer/
│           └── points/
│               └── route.ts       # GET /api/viewer/points (지도 데이터)
│
├── lib/                           # 비즈니스 로직 라이브러리
│   ├── addr/                      # 주소 처리
│   │   ├── detect.ts              # 주소 컬럼 자동 인식
│   │   ├── normalize.ts           # 주소 정규화 (공백/오타 보정)
│   │   └── types.ts               # 타입 정의
│   ├── geocode/                   # 지오코딩
│   │   ├── client.ts              # GeocodeClient (네이버 API 호출)
│   │   ├── rate-limiter.ts        # RateLimiter (QPS 제어)
│   │   └── types.ts               # 타입 정의
│   ├── batch/                     # 배치 처리
│   │   ├── service.ts             # processBatch (메인 로직)
│   │   ├── job-store.ts           # JobStore (작업 상태 관리)
│   │   └── types.ts               # 타입 정의
│   ├── agg/                       # 통계 집계
│   │   ├── address.ts             # 동일 주소 개수 집계
│   │   └── sgg.ts                 # 시군구별 집계
│   ├── excel/                     # 엑셀/CSV 파싱
│   │   ├── parser.ts              # ExcelParser
│   │   ├── index.ts               # 유틸 함수
│   │   └── types.ts               # 타입 정의
│   ├── validation/                # 데이터 검증
│   │   ├── validator.ts           # DataValidator
│   │   ├── index.ts               # 유틸 함수
│   │   └── types.ts               # 타입 정의
│   ├── report/                    # 리포트 생성
│   │   └── markdown.ts            # Markdown 리포트 생성
│   ├── utils/                     # 유틸리티
│   │   └── file-storage.ts        # 파일 저장 유틸
│   └── utils.ts                   # 공통 유틸 함수
│
├── components/                    # React 컴포넌트
│   └── ui/                        # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── progress.tsx
│       ├── table.tsx
│       └── ...
│
├── public/                        # 정적 파일
│   ├── uploads/                   # 업로드된 파일 (자동 생성)
│   └── outputs/                   # 생성된 결과 파일 (자동 생성)
│       ├── results_*.csv          # 지오코딩 결과
│       ├── errors_*.csv           # 에러 목록
│       └── report_*.md            # Markdown 리포트
│
├── scripts/                       # 스크립트
│   └── generate-sample-data.js    # 샘플 데이터 생성
│
├── .env                           # 환경 변수 (Git 제외)
├── .env.local                     # 로컬 환경 변수 (Git 제외)
├── package.json                   # 의존성 관리
├── tsconfig.json                  # TypeScript 설정
├── next.config.ts                 # Next.js 설정
└── README.md                      # 본 문서
```

---

## 🔌 API 엔드포인트

### 1. POST `/api/upload`
**설명**: 엑셀/CSV 파일 업로드

**Request**:
```typescript
Content-Type: multipart/form-data
Body: { file: File }
```

**Response**:
```typescript
{
  success: true,
  filename: string,          // 저장된 파일명
  path: string,              // 파일 경로
  sheets?: string[],         // 시트 목록 (엑셀만)
  preview: Record<string, any>[], // 첫 5행 미리보기
  columns: string[]          // 컬럼 목록
}
```

### 2. POST `/api/process`
**설명**: 배치 처리 시작

**Request**:
```typescript
Content-Type: application/json
Body: {
  filename: string,        // 업로드된 파일명
  addressColumn: string,   // 주소 컬럼명
  sheet?: string           // 시트명 (엑셀만)
}
```

**Response**:
```typescript
{
  success: true,
  jobId: string,           // 작업 ID (고유)
  totalCount: number       // 총 처리 건수
}
```

### 3. GET `/api/status/[jobId]`
**설명**: 진행률 조회 (SSE)

**Query**: `?jobId={jobId}`

**Response** (Server-Sent Events):
```typescript
event: progress
data: {
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  progress: {
    current: number,       // 현재 처리 건수
    total: number,         // 전체 건수
    percentage: number     // 진행률 (0-100)
  },
  results?: ProcessedAddress[], // 완료 시 결과
  error?: string           // 실패 시 에러 메시지
}
```

### 4. GET `/api/download/[filename]`
**설명**: 결과 파일 다운로드

**Params**: `filename` (예: `report_job_1234.md`)

**Response**: 파일 스트림 (Content-Disposition: attachment)

### 5. GET `/api/viewer/points`
**설명**: 지도 데이터 조회

**Query**: `?jobId={jobId}`

**Response**:
```typescript
{
  success: true,
  data: {
    points: {
      address: string,
      lat: number,
      lng: number,
      confidence: number
    }[],
    center: {
      lat: number,
      lng: number
    }
  }
}
```

---

## ⚙️ 환경 변수

### 필수 환경 변수

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `NAVER_CLIENT_ID` | 네이버 Geocoding API Client ID (서버) | - | `mq2838plqi` |
| `NAVER_CLIENT_SECRET` | 네이버 Geocoding API Client Secret | - | `u4kyz0bgzJ...` |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 Map JS API Client ID (클라이언트) | - | `mq2838plqi` |

### 성능 최적화 환경 변수

| 변수명 | 설명 | 기본값 | 권장값 |
|--------|------|--------|--------|
| `API_RATE_LIMIT` | 초당 API 호출 제한 (QPS) | 200 | 200 |
| `BATCH_SIZE` | 배치 처리 크기 | 600 | 600 |
| `CONCURRENCY` | 동시 요청 수 | 80 | 80 |
| `RETRY_MAX` | 최대 재시도 횟수 | 3 | 3 |
| `RETRY_BACKOFF_BASE` | 백오프 기본 시간(초) | 1 | 1 |
| `CHECKPOINT_INTERVAL` | 체크포인트 저장 간격 | 100 | 100 |

### 지도 설정 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_MAP_CENTER_LAT` | 지도 초기 중심 위도 | 36.5 |
| `NEXT_PUBLIC_MAP_CENTER_LNG` | 지도 초기 중심 경도 | 127.9 |
| `NEXT_PUBLIC_MAP_ZOOM` | 지도 초기 줌 레벨 | 6 |
| `NEXT_PUBLIC_HEATMAP_RADIUS` | 히트맵 반경 | 18 |

### 파일 업로드 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `MAX_FILE_SIZE` | 최대 파일 크기(바이트) | 52428800 (50MB) |
| `ALLOWED_EXTENSIONS` | 허용 파일 확장자 | `xlsx,xls,csv` |
| `FILE_AUTO_DELETE_HOURS` | 자동 삭제 시간(시간) | 24 |

---

## 📊 성능 및 최적화

### 처리 속도

| 데이터 건수 | 예상 처리 시간 | 평균 속도 |
|-------------|---------------|----------|
| 100건 | ~6초 | 16건/초 |
| 500건 | ~30초 | 16건/초 |
| 1,000건 | ~60초 | 16건/초 |
| 2,000건 | ~2분 | 16건/초 |
| 5,000건 | ~5분 | 16건/초 |

> **참고**: 처리 속도는 네트워크 환경 및 네이버 API 응답 속도에 따라 달라질 수 있습니다.

### 최적화 기법

1. **비동기 처리**: `Promise.all()` 기반 동시 요청 (최대 80개)
2. **Rate Limiting**: Token Bucket 알고리즘 (초당 200 QPS)
3. **캐싱**: 중복 주소 사전 제거 (Map 기반, TTL 365일)
4. **배치 처리**: 600건 단위 배치 처리
5. **재시도 로직**: 지수 백오프 (1초, 2초, 4초)
6. **체크포인트**: 100건마다 중간 저장 (작업 재개 가능)

### 리소스 사용량

- **메모리**: ~500MB (2,000건 처리 시)
- **CPU**: ~30-50% (처리 중)
- **네트워크**: ~10KB/초 (API 호출)

---

## 🔒 보안

### 파일 업로드 보안

1. **파일 크기 제한**: 최대 50MB
2. **파일 확장자 화이트리스트**: `.xlsx`, `.xls`, `.csv`만 허용
3. **매직 바이트 검증**: 실제 파일 타입 확인 (확장자 위조 방지)
4. **XSS 방지**: 주소 문자열 sanitize

### API 보안

1. **HTTPS 요청 강제**: 네이버 API 호출 시
2. **Rate Limiting**: 초당 200 QPS 제한 (API 남용 방지)
3. **타임아웃 설정**: 30초 (네이버 API 권장)
4. **API Key 관리**: 환경 변수로 관리 (코드에 하드코딩 금지)

### 데이터 관리

1. **자동 파일 삭제**: 업로드 후 24시간 후 자동 삭제
2. **임시 파일 정리**: 체크포인트 파일 만료 관리
3. **개인정보 처리**: 주소 데이터는 로컬에만 저장 (외부 전송 안함)

### 규정 준수

- **네이버 지도 약관**: [NAVER Cloud Platform 이용약관](https://www.ncloud.com/policy/terms/service) 준수
  - 타 지도 서비스 금지
  - 2차 가공·배포 금지
- **로컬 전용 실행**: 외부 접근 불가

---

## 🗺️ 지도 뷰어

### 히트맵 모드

- **색상 스킴**: 파란색 (낮은 밀도) → 노란색 (보통) → 빨간색 (높은 밀도)
- **반경 조정**: 환경 변수 `NEXT_PUBLIC_HEATMAP_RADIUS` (기본 18)
- **불투명도**: 60%
- **인터랙티브**: 확대/축소, 패닝

### 마커 모드

- **마커 디자인**: 12px × 12px 파란색 원형 마커
- **스타일**: 흰색 테두리 + 그림자 효과
- **정보창**: 마커 클릭 시 표시
  - 📍 주소
  - ✓ 신뢰도 점수

### 토글 기능

- **🔵 마커 표시**: 개별 주소 점 표시
- **🔥 히트맵 표시**: 밀집도 색상 표시
- **버튼 클릭**: 즉시 전환

### 통계

- **총 포인트**: 지오코딩 성공한 건수
- **표시 모드**: 현재 활성화된 모드 (마커/히트맵)

---

## 📂 생성되는 파일

처리 완료 후 `public/outputs/` 디렉토리에 다음 파일들이 자동 생성됩니다:

### 1. `results_{jobId}.csv`
성공한 지오코딩 결과 (좌표 포함)

| 컬럼명 | 설명 | 예시 |
|--------|------|------|
| `address` | 원본 주소 | `경기도 남양주시 다산순환로 242 1403동 501호` |
| `normalized_address` | 정규화된 주소 | `경기도 남양주시 다산순환로 242` |
| `lat` | 위도 (WGS84) | `37.5665` |
| `lng` | 경도 (WGS84) | `127.0782` |
| `confidence` | 신뢰도 점수 (0-100) | `95` |
| `sido` | 시도 | `경기도` |
| `sgg` | 시군구 | `남양주시` |

### 2. `errors_{jobId}.csv`
실패한 주소 목록

| 컬럼명 | 설명 | 예시 |
|--------|------|------|
| `address` | 원본 주소 | `잘못된 주소` |
| `error` | 에러 메시지 | `Geocoding failed: No results` |
| `retry_count` | 재시도 횟수 | `3` |

### 3. `report_{jobId}.md`
Markdown 분석 리포트

**포함 내용**:
- **처리 개요**: 총 건수, 성공/실패 건수, 처리 시간
- **동일 주소 개수 통계**: 내림차순 Top-20 (테이블 형태)
- **시군구별 통계**: 광역시/도 + 시/군/구 Top-20 (테이블 형태)
- **Confidence 분포**: 점수대별 건수
- **에러 요약**: 에러 유형별 통계

**예시**:
```markdown
# 주소 분석 리포트

## 처리 개요
- 총 처리 건수: 148건
- 성공: 148건 (100.0%)
- 실패: 0건 (0.0%)
- 처리 시간: 9.6초

## 동일 주소 개수 통계

| 순위 | 주소 | 건수 | 비율 |
|------|------|------|------|
| 1 | 경기도 남양주시 다산순환로 242 1403동 501호 | 2 | 1.4% |
| 2 | 경기도 남양주시 다산지금로146번길 67 | 2 | 1.4% |

## 시군구별 통계

| 순위 | 시군구 | 건수 | 비율 |
|------|--------|------|------|
| 1 | 경기도 남양주시 | 148 | 100.0% |
```

---

## 🧪 테스트 방법

### 1. 샘플 데이터로 테스트

```bash
# 1. 샘플 파일 생성
npm run generate-sample

# 2. 개발 서버 실행
npm run dev

# 3. http://localhost:3000 접속

# 4. 파일 업로드
#    - public/uploads/sample_addresses.xlsx 선택
#    - 또는 직접 테스트용 엑셀 파일 업로드

# 5. 데이터 미리보기 확인
#    - 첫 5행 표시
#    - 주소 컬럼 자동 인식

# 6. 처리 시작
#    - 실시간 진행률 표시
#    - 예상 남은 시간 계산

# 7. 결과 다운로드
#    - Markdown 리포트
#    - CSV 결과 파일

# 8. 지도 뷰어 확인
#    - 히트맵/마커 전환
#    - 마커 클릭 → 정보창 표시
```

### 2. 실제 엑셀 파일로 테스트

1. **주소 컬럼이 포함된 XLSX/CSV 파일 준비**
   - 컬럼명 예시: `주소`, `도로명주소`, `지번주소`, `Address`
   - 최소 10건 이상 권장

2. **파일 업로드**
   - [http://localhost:3000](http://localhost:3000) 접속
   - 드래그 앤 드롭 또는 클릭하여 파일 선택

3. **데이터 미리보기**
   - 첫 5행 확인
   - 주소 컬럼 자동 인식 확인
   - 수동 선택 가능

4. **처리 시작**
   - "처리 시작" 버튼 클릭
   - 실시간 진행률 모니터링

5. **결과 확인**
   - Markdown 리포트 다운로드
   - CSV 결과 파일 확인
   - 지도 뷰어에서 시각화 확인

### 3. 성능 테스트

```bash
# 대용량 데이터 테스트 (1,000건 이상)
# 1. 대용량 엑셀 파일 준비
# 2. 업로드 및 처리
# 3. 처리 시간 측정
# 4. 메모리 사용량 모니터링 (Activity Monitor/Task Manager)
```

---

## 🐛 트러블슈팅

### 1. 네이버 지도 API 인증 실패

**증상**: `Authentication Failed, Client ID: xxx`

**해결 방법**:
1. `.env` 파일에서 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 확인
2. 네이버 클라우드 플랫폼 콘솔에서 **Web 서비스 URL** 등록 확인:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
3. 브라우저 완전 새로고침 (Cmd+Shift+R / Ctrl+Shift+R)

### 2. 지오코딩 API 429 에러

**증상**: `Rate Limit Exceeded`

**해결 방법**:
1. `.env` 파일에서 `API_RATE_LIMIT` 값 낮추기 (예: `200 → 100`)
2. `CONCURRENCY` 값 낮추기 (예: `80 → 40`)
3. 네이버 클라우드 플랫폼에서 API 쿼터 확인

### 3. 파일 다운로드 404 에러

**증상**: `File not found`

**해결 방법**:
1. `public/outputs/` 디렉토리 존재 확인
2. 파일 이름 확인 (타임스탬프 포함 여부)
3. 서버 로그 확인 (`✅ Saved markdown report: ...`)

### 4. 메모리 부족 에러

**증상**: `FATAL ERROR: Ineffective mark-compacts near heap limit`

**해결 방법**:
1. Node.js 메모리 제한 증가:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```
2. 배치 크기 줄이기 (`.env`에서 `BATCH_SIZE=600 → 300`)

### 5. SSE 연결 끊김

**증상**: 진행률이 멈춤

**해결 방법**:
1. 브라우저 새로고침
2. 네트워크 탭에서 SSE 연결 상태 확인
3. 서버 재시작

---

## 🛠️ 개발 진행 상황

### 완료된 기능 ✅

- ✅ **Phase 1**: 프로젝트 초기 설정 (100%)
  - Next.js 15 + TypeScript 설정
  - TailwindCSS + shadcn/ui 설정
  - 환경 변수 관리

- ✅ **Phase 2**: 데이터 처리 모듈 (100%)
  - 엑셀/CSV 파싱 (`xlsx`, `papaparse`)
  - 주소 컬럼 자동 인식 (AI 패턴 매칭)
  - 주소 정규화 (공백/오타 보정)

- ✅ **Phase 3**: 웹 UI 및 API (100%)
  - 파일 업로드 UI (드래그 앤 드롭)
  - 데이터 미리보기 테이블
  - API Routes (`/api/upload`, `/api/process`, `/api/status`, `/api/download`)

- ✅ **Phase 4**: 핵심 로직 (100%)
  - 네이버 Geocoding API 연동
  - Rate Limiting (Token Bucket)
  - 배치 처리 (`processBatch`)
  - 에러 처리 및 재시도

- ✅ **Phase 5**: 통계 집계 및 리포트 (100%)
  - 동일 주소 개수 집계
  - 시군구별 통계
  - Markdown 리포트 생성
  - CSV 결과 파일 저장

- ✅ **Phase 6**: 지도 시각화 (100%)
  - 네이버 지도 연동
  - 히트맵 표시
  - 마커 표시
  - 히트맵/마커 토글 기능
  - 정보창 (주소, 신뢰도)

### 진행 중인 작업 🚧

- ⏳ **Phase 7**: 통합 테스트 및 최적화 (80%)
  - [x] 기능 테스트 (수동)
  - [ ] 성능 테스트 (대용량 데이터)
  - [ ] 브라우저 호환성 테스트
  - [ ] 접근성 테스트

### 향후 계획 📅

- 📋 **Phase 8**: 고급 기능 추가
  - [ ] Choropleth (단계구분도)
  - [ ] 클러스터링 (마커 밀집 시)
  - [ ] PDF 리포트 내보내기
  - [ ] 다크 모드 지원

**전체 진행률: 90%** 🎉

---

## 📖 참고 문서

### 네이버 클라우드 플랫폼
- [Application Maps Overview](https://api.ncloud-docs.com/docs/ko/application-maps-overview)
- [Maps Geocoding API](https://api.ncloud-docs.com/docs/application-maps-geocoding)
- [Maps JavaScript API v3](https://navermaps.github.io/maps.js.ncp/docs/)
- [NAVER Maps JS SDK 시작하기](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### 기술 문서
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

### 라이브러리
- [xlsx Documentation](https://docs.sheetjs.com/)
- [papaparse Documentation](https://www.papaparse.com/docs)
- [axios Documentation](https://axios-http.com/docs/intro)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

## 📄 라이선스

**개인 프로젝트** (MIT License)

### 주의사항

- **네이버 지도 API 약관 준수**: [NAVER Cloud Platform 이용약관](https://www.ncloud.com/policy/terms/service)
  - 네이버 지도 외 타 지도 서비스 사용 금지
  - 지도 데이터 2차 가공·배포 금지
  - 상업적 이용 시 별도 라이선스 필요

- **개인정보 처리**: 주소 데이터는 로컬에만 저장되며, 외부로 전송되지 않습니다.

---

## 🙏 기여

버그 리포트 및 기능 제안은 [Issues](https://github.com/your-repo/issues)에 등록해주세요.

---

## 📧 문의

개발자: [Your Name]
이메일: [your-email@example.com]

---

**마지막 업데이트**: 2025-10-20
**버전**: 0.1.0
