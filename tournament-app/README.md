# Tournament App

e스포츠 토너먼트 참가 신청 및 관리 시스템

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Image Processing**: Sharp + Remove.bg API
- **Deployment**: Vercel

## Features

### Public Features
- 대회 목록 조회
- 대회 상세 정보 확인
- 참가 신청 (닉네임, 실력 레벨, 프로필 사진)
- 자동 카드 생성 (배경 제거 + 카드 템플릿 합성)
- 팀 구성 및 대진표 조회

### Admin Features
- 대회 생성/수정/삭제
- 참가자 관리
- 대회 마감 및 자동 팀 편성 (실력 밸런싱)
- 대진표 생성 및 결과 입력

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행
3. Storage에서 `profiles`와 `cards` 버킷 생성 (Public access)

### 3. Environment Variables

`.env.local.example`을 `.env.local`로 복사하고 값 설정:

```bash
cp .env.local.example .env.local
```

필수 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `ADMIN_PASSWORD`: 관리자 로그인 비밀번호

선택 환경 변수:
- `REMOVEBG_API_KEY`: Remove.bg API 키 (배경 제거용)

### 4. Card Templates

카드 템플릿 이미지를 `public/card-templates/`에 추가:
- `bronze.webp`
- `silver.webp`
- `gold.jpeg`
- `special.png`
- `legend.webp`

### 5. Run Development Server

```bash
npm run dev
```

- 공개 페이지: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin

## Project Structure

```
tournament-app/
├── app/
│   ├── page.tsx                      # 메인 (대회 목록)
│   ├── tournament/[id]/
│   │   ├── page.tsx                  # 대회 상세 + 참가 신청
│   │   └── bracket/page.tsx          # 대진표 조회
│   ├── admin/
│   │   ├── page.tsx                  # 대시보드
│   │   ├── login/page.tsx            # 로그인
│   │   ├── create/page.tsx           # 대회 생성
│   │   └── tournaments/[id]/
│   │       ├── page.tsx              # 대회 관리
│   │       └── bracket/page.tsx      # 대진표 관리
│   └── api/                          # API Routes
├── components/ui/                    # shadcn/ui components
├── lib/
│   ├── supabase/                     # Supabase clients
│   ├── services/                     # Business logic
│   ├── utils/                        # Utilities
│   └── constants.ts                  # Constants
├── types/                            # TypeScript types
└── supabase/
    └── schema.sql                    # Database schema
```

## Deployment

### Vercel

1. GitHub에 repository push
2. Vercel에서 새 프로젝트 생성 및 연결
3. Environment Variables 설정
4. Deploy

## Team Balancing Algorithm

팀 편성 알고리즘 (`lib/utils/team-balancing.ts`):

1. 참가자를 실력순 정렬 (skill_value 오름차순)
2. 가장 높은 실력자와 가장 낮은 실력자 매칭
3. 두 번째 높은 실력자와 두 번째 낮은 실력자 매칭
4. 반복
5. 홀수인 경우 마지막 참가자와 조커(세미프로) 팀 구성

결과: 각 팀의 평균 실력이 비슷하게 분배됨

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournaments` | 대회 목록 |
| POST | `/api/tournaments` | 대회 생성 |
| GET | `/api/tournaments/[id]` | 대회 상세 |
| PUT | `/api/tournaments/[id]` | 대회 수정 |
| DELETE | `/api/tournaments/[id]` | 대회 삭제 |
| POST | `/api/tournaments/[id]/close` | 대회 마감 + 팀 편성 |
| POST | `/api/tournaments/[id]/reopen` | 대회 재개 |
| GET | `/api/tournaments/[id]/bracket` | 대진표 조회 |
| POST | `/api/tournaments/[id]/bracket` | 대진표 생성 |
| PUT | `/api/tournaments/[id]/bracket` | 경기 결과 입력 |
| POST | `/api/participants` | 참가 신청 |
| DELETE | `/api/participants?id=xxx` | 참가자 삭제 |
| POST | `/api/card/generate` | 카드 생성 |
| GET | `/api/teams?tournament_id=xxx` | 팀 조회 |
| PUT | `/api/teams` | 팀명 변경 |
