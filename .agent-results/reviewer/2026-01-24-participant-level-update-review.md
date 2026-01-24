# 코드 리뷰 결과

**리뷰일**: 2026-01-24
**관련 작업**: participant-level-update
**판정**: 🔴 **재작업 필요**

---

## 리뷰 대상 파일

1. `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/app/api/participants/route.ts` (57-92 라인)
2. `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/lib/services/tournament.ts` (263-297 라인)
3. `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/app/admin/tournaments/[id]/page.tsx` (188-207, 367-388 라인)

---

## 발견된 이슈

### 🔴 Critical (즉시 수정) - 1개

#### 1. `console.error` 잔존 (프로덕션 배포 금지 코드)
**파일**: `route.ts:52`, `route.ts:89`, `route.ts:116`, `tournament.ts:342`, `tournament.ts:418`, `tournament.ts:428`, `page.tsx:118`

**문제**:
- 프로젝트 전역에 `console.error`, `console.log`, `console.warn` 사용
- 프로덕션 환경에서 민감 정보 노출 가능
- 디버깅 코드가 프로덕션 빌드에 포함됨

**근거**: 자동 🔴 판정 조건 - "`console.log` 잔존"

**권장 수정**:
```typescript
// BAD
console.error('POST /api/participants error:', error)

// GOOD - 적절한 로깅 라이브러리 사용
import { logger } from '@/lib/logger'
logger.error('POST /api/participants error:', { error, context: 'api/participants' })
```

또는 최소한:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('POST /api/participants error:', error)
}
```

---

### 🟡 Major (수정 권장) - 4개

#### 1. 잘못된 상수 사용 패턴 (타입 안전성 부족)
**파일**: `page.tsx:381-385`

**문제**:
```typescript
{Object.entries(SKILL_LABELS).map(([value, label]) => (
  <SelectItem key={value} value={label}>
    {label}
  </SelectItem>
))}
```

**분석**:
- `SKILL_LABELS`는 `Record<number, string>` 타입 (숫자 키 → 문자열 값)
- `Object.entries(SKILL_LABELS)` 결과: `["1", "루키"], ["2", "비기너"], ...`
- **value는 "1", "2" 등의 문자열인데, label("루키", "비기너")을 SelectItem의 value로 사용**
- `handleUpdateSkill(participant.id, value)` 호출 시 "루키" 문자열이 전달되어야 하는데, 코드 로직이 불명확함
- API는 `skill` 필드로 "루키", "비기너" 등의 문자열을 기대하지만, 코드가 혼란스러움

**올바른 구현**:
```typescript
// SKILL_LABELS 대신 SKILLS의 키를 사용
{Object.keys(SKILLS).map((skill) => (
  <SelectItem key={skill} value={skill}>
    {skill}
  </SelectItem>
))}
```

또는 상수 구조 변경:
```typescript
export const SKILL_OPTIONS = [
  { value: "루키", label: "루키", skillValue: 1 },
  { value: "비기너", label: "비기너", skillValue: 2 },
  // ...
] as const
```

**판정 근거**: 타입 안전성 부족, 잠재적 런타임 에러 가능성

---

#### 2. 대회 상태 검증 누락 (비즈니스 로직 오류)
**파일**: `tournament.ts:263-297`, `route.ts:57-92`

**문제**:
- `updateParticipantSkill` 함수가 **대회 상태(open/closed)를 확인하지 않음**
- 마감된 대회의 참가자 레벨을 변경할 수 있음
- 팀 편성 후 레벨 변경 시 팀 밸런스가 깨짐

**시나리오**:
1. 대회 마감 → 팀 자동 편성 (실력 기반)
2. 관리자가 참가자 레벨 변경
3. **팀 밸런스 붕괴** (프로 → 루키 변경 시)

**권장 수정**:
```typescript
export async function updateParticipantSkill(
  id: string,
  skill: string,
  skillValue: number
): Promise<{ success: boolean; error?: string; participant?: Participant }> {
  const supabase = await createClient()

  // 참가자 및 대회 상태 확인
  const { data: existing, error: fetchError } = await supabase
    .from('participants')
    .select('*, tournament:tournaments(status)')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: '참가자를 찾을 수 없습니다.' }
  }

  // 대회가 마감된 경우 레벨 변경 금지
  if (existing.tournament.status === 'closed') {
    return { success: false, error: '마감된 대회의 참가자 정보는 변경할 수 없습니다.' }
  }

  // 업데이트 진행...
}
```

**UI 수정**:
```tsx
<Select
  value={participant.skill}
  onValueChange={(value) => handleUpdateSkill(participant.id, value)}
  disabled={updatingSkill === participant.id || !isOpen}  // 추가
>
```

**판정 근거**: 비즈니스 로직 무결성 위반, 데이터 정합성 문제

---

#### 3. 에러 처리 불일치
**파일**: `route.ts:84`

**문제**:
```typescript
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 404 })
}
```

**분석**:
- `updateParticipantSkill` 함수는 "참가자를 찾을 수 없습니다"와 "업데이트 실패" 두 가지 에러를 반환 가능
- 둘 다 `404 Not Found` 상태 코드 반환
- **업데이트 실패는 `500 Internal Server Error` 또는 `400 Bad Request`가 적절**

**권장 수정**:
```typescript
// 서비스 레이어에서 에러 타입 구분
export async function updateParticipantSkill(...) {
  // ...
  if (fetchError || !existing) {
    return { success: false, error: '참가자를 찾을 수 없습니다.', errorType: 'NOT_FOUND' }
  }

  if (updateError) {
    return { success: false, error: '실력 레벨 업데이트에 실패했습니다.', errorType: 'UPDATE_FAILED' }
  }
}

// API 라우트에서 적절한 상태 코드 반환
if (!result.success) {
  const status = result.errorType === 'NOT_FOUND' ? 404 : 500
  return NextResponse.json({ error: result.error }, { status })
}
```

**판정 근거**: RESTful API 표준 위반

---

#### 4. 낙관적 업데이트 미사용 (UX 저하)
**파일**: `page.tsx:188-207`

**문제**:
- 드롭다운 변경 → API 호출 → 페이지 전체 리로드 (`fetchTournament()`)
- 사용자 경험 저하 (불필요한 네트워크 요청)

**권장 개선**:
```typescript
async function handleUpdateSkill(participantId: string, newSkill: string) {
  setUpdatingSkill(participantId)

  // 낙관적 업데이트
  setTournament(prev => prev ? {
    ...prev,
    participants: prev.participants.map(p =>
      p.id === participantId
        ? { ...p, skill: newSkill, skill_value: SKILLS[newSkill] }
        : p
    )
  } : null)

  try {
    const res = await fetch('/api/participants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: participantId, skill: newSkill })
    })

    if (!res.ok) {
      // 실패 시 원복
      fetchTournament()
      const error = await res.json()
      throw new Error(error.error || '레벨 변경에 실패했습니다')
    }

    toast.success('실력 레벨이 변경되었습니다')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '레벨 변경에 실패했습니다')
  } finally {
    setUpdatingSkill(null)
  }
}
```

**판정 근거**: 성능 및 UX 개선 여지

---

### 🟢 Minor (개선 제안) - 3개

#### 1. 타입 정의 중복
**파일**: `page.tsx:62-71`

**문제**:
- 컴포넌트 내부에 `Participant` 인터페이스 재정의
- 프로젝트 전역 타입(`@/types/database`)과 중복

**권장**:
```typescript
import type { Participant } from '@/types/database'
```

---

#### 2. 매직 문자열 사용
**파일**: `page.tsx:101`

**문제**:
```typescript
const [updatingSkill, setUpdatingSkill] = useState<string | null>(null)
```

- 참가자 ID를 문자열로 저장하지만, boolean이나 Map 구조가 더 명확

**권장**:
```typescript
const [updatingSkillId, setUpdatingSkillId] = useState<string | null>(null)
```

---

#### 3. 접근성 개선 필요
**파일**: `page.tsx:367-388`

**문제**:
- Select 컴포넌트에 `aria-label` 누락
- 스크린 리더 사용자 고려 부족

**권장**:
```tsx
<Select
  value={participant.skill}
  onValueChange={(value) => handleUpdateSkill(participant.id, value)}
  disabled={updatingSkill === participant.id}
  aria-label={`${participant.nickname}의 실력 레벨 변경`}
>
```

---

### 📘 Info (참고) - 1개

#### 1. API 응답 형식 통일
현재 프로젝트는 일관된 API 응답 형식을 사용 중:
```typescript
{ error: string } // 실패
{ ...data }       // 성공
```

더 명확한 형식:
```typescript
{ success: false, error: string, code?: string }
{ success: true, data: T }
```

---

## 잘한 점

1. **입력 검증 철저**: API 라우트에서 필수 필드 검증 (`id`, `skill`)
2. **SKILLS 상수 활용**: 하드코딩 대신 상수 사용
3. **로딩 상태 관리**: `updatingSkill` 상태로 중복 요청 방지
4. **에러 메시지 한국어 제공**: 사용자 친화적
5. **기존 패턴 준수**: `addParticipant` 함수와 유사한 구조

---

## 개선 제안

### 1. 프로덕션 로깅 전략 수립
```typescript
// lib/logger.ts 생성
export const logger = {
  error: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket 등 외부 서비스로 전송
    } else {
      console.error(message, meta)
    }
  }
}
```

### 2. 타입 안전성 강화
```typescript
// constants.ts
export const SKILL_OPTIONS = [
  { key: "루키", value: "루키", skillValue: 1 },
  { key: "비기너", value: "비기너", skillValue: 2 },
  { key: "아마추어", value: "아마추어", skillValue: 3 },
  { key: "세미프로", value: "세미프로", skillValue: 4 },
  { key: "프로", value: "프로", skillValue: 5 }
] as const

export type SkillLevel = typeof SKILL_OPTIONS[number]["value"]
```

### 3. API 테스트 추가
```typescript
// __tests__/api/participants/update-skill.test.ts
describe('PUT /api/participants', () => {
  it('should update participant skill', async () => {
    // ...
  })

  it('should reject invalid skill level', async () => {
    // ...
  })

  it('should reject non-existent participant', async () => {
    // ...
  })

  it('should prevent updating closed tournament participant', async () => {
    // 추가 필요
  })
})
```

---

## Supervisor 권고

### 재작업 필요 여부
**예** - Critical 1개, Major 4개

### 담당 에이전트

#### **frontend-developer**:
1. Select 컴포넌트 값 매핑 수정 (SKILL_LABELS → SKILLS 키 사용)
2. 낙관적 업데이트 구현
3. 마감된 대회 시 드롭다운 비활성화 UI 추가
4. 접근성 개선 (aria-label 추가)

#### **backend-developer**:
1. `console.error` 제거 및 적절한 로깅 전략 구현
2. `updateParticipantSkill`에 대회 상태 검증 로직 추가
3. 에러 타입별 HTTP 상태 코드 구분
4. API 응답 형식 표준화

#### **test-runner**:
1. PUT `/api/participants` API 테스트 작성
2. 대회 상태에 따른 레벨 변경 제한 테스트
3. 잘못된 입력값 처리 테스트

### 우선순위

1. **[높음 - Critical]** `console.error` 제거 (전체 프로젝트)
2. **[높음 - Major]** Select 컴포넌트 값 매핑 수정 (현재 버그 가능성)
3. **[높음 - Major]** 대회 상태 검증 로직 추가 (비즈니스 로직 무결성)
4. **[중간 - Major]** 에러 처리 개선 (HTTP 상태 코드)
5. **[중간 - Major]** 낙관적 업데이트 구현 (UX)
6. **[낮음 - Minor]** 타입 중복 제거
7. **[낮음 - Minor]** 접근성 개선

---

## 최종 의견

이 코드는 **기본적인 기능 구현은 완료**되었으나, **프로덕션 배포에는 부적합**합니다.

### 프로덕션 배포 전 필수 수정 사항:
1. `console.error` 제거 (보안 위험)
2. Select 값 매핑 버그 수정 (현재 동작 불명확)
3. 대회 상태 검증 추가 (데이터 정합성)

### 새벽 3시 장애 시나리오:
> 마감된 대회의 참가자 레벨을 변경 → 팀 밸런스 붕괴 → 사용자 불만 → 긴급 복구 필요

### 해커 관점 평가:
> `console.error`를 통해 내부 에러 메시지, 스택 트레이스 노출 가능 → 시스템 구조 파악

### 1년 후 유지보수성:
> SKILL_LABELS 사용 패턴이 혼란스러워 버그 수정 시 추가 시간 소요 예상

**재작업 후 재검토 필요합니다.**

---

**리뷰어**: Code Reviewer Agent (무자비한 품질 검사관)
**리뷰 완료 시각**: 2026-01-24
