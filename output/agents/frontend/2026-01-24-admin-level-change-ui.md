# Frontend 작업 결과

**작업일**: 2026-01-24
**작업명**: admin-level-change-ui

## 변경된 파일

1. `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/app/api/participants/route.ts` - 수정 (라인 57-88)
   - PUT 메서드 추가 (참가자 실력 레벨 업데이트 API)

2. `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/app/admin/tournaments/[id]/page.tsx` - 수정
   - Select 컴포넌트 import 추가 (라인 18-23)
   - SKILL_LABELS import 추가 (라인 40)
   - updatingSkill 상태 추가 (라인 93)
   - handleUpdateSkill 함수 추가 (라인 180-196)
   - 참가자 테이블의 실력 컬럼을 Select 드롭다운으로 변경 (라인 336-355)

## 구현 내용

### 1. API 엔드포인트 추가
- `PUT /api/participants` 엔드포인트 구현
- Request body: `{ id: string, skill: string }`
- 유효성 검증:
  - id와 skill 필수 필드 확인
  - SKILLS 상수를 통한 유효한 레벨인지 확인
- Supabase를 통해 participants 테이블의 skill 및 skill_value 업데이트

### 2. 관리자 페이지 UI 개선
- shadcn/ui Select 컴포넌트를 사용한 인라인 레벨 변경 기능
- 참가자 테이블에서 실력 레벨을 드롭다운으로 직접 선택 가능
- 로딩 상태 처리:
  - `updatingSkill` 상태로 현재 업데이트 중인 참가자 추적
  - 업데이트 중일 때 Loader2 아이콘 표시
  - Select 컴포넌트 비활성화
- 토스트 메시지:
  - 성공 시: "실력 레벨이 변경되었습니다"
  - 실패 시: API 에러 메시지 또는 "레벨 변경에 실패했습니다"
- 데이터 새로고침: 변경 성공 시 `fetchTournament()` 호출

### 3. 사용자 경험 개선
- 드롭다운에서 5가지 레벨 선택 가능 (루키, 비기너, 아마추어, 세미프로, 프로)
- Select 컴포넌트 크기를 `size="sm"`, `w-[120px]`로 설정하여 테이블에 적합하게 조정
- 기존 UI 스타일과 일관성 유지 (Tailwind CSS, shadcn/ui)

## 스크린샷/미리보기
N/A (실제 실행 환경 필요)

## 테스트 필요 여부
예 - 다음 항목 테스트 필요:
1. Select 드롭다운이 정상적으로 열리는지 확인
2. 레벨 변경 시 API 호출이 정상적으로 이루어지는지 확인
3. 성공/실패 토스트 메시지가 올바르게 표시되는지 확인
4. 로딩 상태 동안 Select가 비활성화되고 Loader 아이콘이 표시되는지 확인
5. 데이터 새로고침이 자동으로 이루어지는지 확인
6. 동시에 여러 참가자의 레벨을 변경할 때 충돌이 없는지 확인

## 기술적 세부사항

### 사용한 컴포넌트
- shadcn/ui Select (Radix UI 기반)
- Lucide React Icons (Loader2)
- Sonner Toast

### 상태 관리
```typescript
const [updatingSkill, setUpdatingSkill] = useState<string | null>(null)
```
- 현재 업데이트 중인 참가자 ID 추적
- 로딩 상태 표시 및 중복 요청 방지

### API 호출 패턴
```typescript
async function handleUpdateSkill(participantId: string, newSkill: string) {
  setUpdatingSkill(participantId)
  try {
    const res = await fetch('/api/participants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: participantId, skill: newSkill })
    })
    // ... error handling
    toast.success('실력 레벨이 변경되었습니다')
    fetchTournament()
  } finally {
    setUpdatingSkill(null)
  }
}
```

## 코드 컨벤션 준수
- TypeScript 타입 안전성 유지
- Tailwind CSS 사용 (다크 모드 지원은 shadcn/ui가 자동 처리)
- camelCase 네이밍 (함수, 변수)
- 에러 핸들링 및 사용자 피드백 제공
- 기존 코드 스타일 패턴 준수
