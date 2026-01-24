// 실력 레벨 정의 (낮을수록 높은 실력)
export const SKILLS: Record<string, number> = {
  "루키": 1,
  "비기너": 2,
  "아마추어": 3,
  "세미프로": 4,
  "프로": 5
}

// 실력 레벨 역방향 맵핑
export const SKILL_LABELS: Record<number, string> = {
  1: "루키",
  2: "비기너",
  3: "아마추어",
  4: "세미프로",
  5: "프로"
}

// 카드 등급 순서 (업그레이드 경로)
export const CARD_TIERS = ["브론즈", "실버", "골드", "스페셜", "레전드"] as const
export type CardTier = typeof CARD_TIERS[number]

// 카드 등급별 템플릿 파일
export const CARD_TEMPLATES: Record<CardTier, string> = {
  "브론즈": "/card-templates/bronze.webp",
  "실버": "/card-templates/silver.webp",
  "골드": "/card-templates/gold.jpeg",
  "스페셜": "/card-templates/special.png",
  "레전드": "/card-templates/legend.webp"
}

// 색상 테마 (EA Sports FC26 스타일)
export const COLORS = {
  neon_green: "#00FF87",      // 주요 액센트
  cyan: "#00D4FF",            // 보조 액센트
  magenta: "#FF2882",         // 강조색
  gold: "#FFD700",            // 우승/특별
  dark: "#0A0A0A",            // 배경
  dark_card: "#111111",       // 카드 배경
  dark_lighter: "#1A1A1A",    // 밝은 배경
  dark_elevated: "#0D1117",   // 높은 배경
  gray: "#6A6A6A",
  gray_light: "#A0A0A0"
} as const

// 페이지 설정
export const PAGE_CONFIG = {
  title: "e스포츠 토너먼트",
  description: "e스포츠 토너먼트 참가 신청 및 관리 시스템",
}

// 조커 참가자 정보
export const JOKER_PARTICIPANT = {
  nickname: "조커 (관리자)",
  skill: "세미프로",
  skill_value: 4,
  is_joker: true
} as const
