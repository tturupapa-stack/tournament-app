# Backend 작업 결과

**작업일**: 2026-01-24
**작업명**: participant-level-update-api

## 변경된 파일
- `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/app/api/participants/route.ts` - PUT 메서드 추가 및 개선
- `/Users/larkkim/Desktop/💼 프로젝트/무제 폴더/ttt/tournament-app/lib/services/tournament.ts` - updateParticipantSkill 함수 신규 생성

## 새 API 엔드포인트
| Method | Path | 설명 |
|--------|------|------|
| PUT | /api/participants | 참가자의 실력 레벨 수정 |

## API 상세

### PUT /api/participants

**Request Body**:
```json
{
  "id": "participant_uuid",
  "skill": "루키" // 또는 "비기너", "아마추어", "세미프로", "프로"
}
```

**Response (200)**:
```json
{
  "id": "participant_uuid",
  "tournament_id": "tournament_uuid",
  "nickname": "참가자명",
  "skill": "루키",
  "skill_value": 1,
  "card_tier": "브론즈",
  "profile_image_url": "...",
  "card_image_url": "...",
  "is_joker": false,
  "created_at": "2026-01-24T..."
}
```

**Error Responses**:
- `400`: 필수 필드 누락 (id, skill)
- `400`: 유효하지 않은 실력 레벨
- `404`: 참가자를 찾을 수 없음
- `500`: 서버 오류

**유효한 skill 값**:
- 루키 (skill_value: 1)
- 비기너 (skill_value: 2)
- 아마추어 (skill_value: 3)
- 세미프로 (skill_value: 4)
- 프로 (skill_value: 5)

## cURL 예시

### 성공 케이스
```bash
curl -X PUT http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "skill": "프로"
  }'
```

### 에러 케이스 - 유효하지 않은 skill
```bash
curl -X PUT http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "skill": "마스터"
  }'
# Response: { "error": "유효하지 않은 실력 레벨입니다. 가능한 값: 루키, 비기너, 아마추어, 세미프로, 프로" }
```

### 에러 케이스 - 존재하지 않는 참가자
```bash
curl -X PUT http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{
    "id": "invalid-id",
    "skill": "프로"
  }'
# Response: { "error": "참가자를 찾을 수 없습니다." }
```

## 구현 세부사항

### 서비스 레이어 (tournament.ts)
새로운 `updateParticipantSkill` 함수 추가:
- 참가자 존재 여부 확인
- skill 및 skill_value 동시 업데이트
- 성공/실패 여부와 에러 메시지를 포함한 결과 반환

```typescript
export async function updateParticipantSkill(
  id: string,
  skill: string,
  skillValue: number
): Promise<{ success: boolean; error?: string; participant?: Participant }>
```

### API 레이어 (route.ts)
- 요청 검증: id, skill 필수 필드 확인
- skill 유효성 검증: SKILLS 상수와 비교
- 서비스 레이어 호출하여 비즈니스 로직 분리
- 적절한 HTTP 상태 코드 반환 (200, 400, 404, 500)
- 업데이트된 참가자 정보 전체 반환

## 테스트 필요 여부
예 - 다음 항목들을 테스트해야 합니다:
1. 정상적인 레벨 업데이트 (각 skill 값별)
2. 유효하지 않은 skill 값 입력 시 에러 처리
3. 존재하지 않는 participant id로 요청 시 에러 처리
4. 필수 필드 누락 시 에러 처리
5. skill_value가 자동으로 올바르게 업데이트되는지 확인

## 주요 특징
- **타입 안전성**: TypeScript를 활용한 타입 검증
- **레이어 분리**: API 레이어와 서비스 레이어 분리로 유지보수성 향상
- **일관된 패턴**: 기존 POST, DELETE 메서드와 동일한 에러 처리 패턴 적용
- **자동 업데이트**: skill 변경 시 skill_value도 자동으로 동기화
- **상세한 에러 메시지**: 사용자가 문제를 파악할 수 있도록 명확한 에러 메시지 제공
