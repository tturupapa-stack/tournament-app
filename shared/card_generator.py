"""
선수 카드 생성 모듈

FIFA 스타일 선수 카드를 생성합니다.
- 배경 제거
- 카드 템플릿 합성
- 텍스트 오버레이
"""

import os
import io
import re
import logging
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont

# rembg는 지연 로딩 (onnxruntime 미설치 시 모듈 전체 로드 실패 방지)
# from rembg import remove, new_session

from .config import (
    CARD_TEMPLATES,
    CARD_TIERS,
    PROFILE_DIR,
    CARD_DIR,
    UPLOAD_DIR
)

logger = logging.getLogger(__name__)


class CardGenerationError(Exception):
    """카드 생성 중 발생하는 에러"""
    pass

# 이미지 설정
MAX_IMAGE_SIZE_MB = 10
ALLOWED_FORMATS = {'PNG', 'JPEG', 'JPG', 'WEBP'}
CARD_SIZE = (300, 450)  # 카드 표준 크기
PERSON_SIZE = (250, 300)  # 인물 영역 크기
PERSON_POSITION = (25, 80)  # 인물 배치 위치 (x, y)

# 텍스트 설정
TEXT_POSITION_SKILL_RATING = (40, 50)  # 스킬 레이팅 숫자 위치 (좌측 상단)
TEXT_POSITION_SKILL_LABEL = (40, 95)  # 스킬 레벨 텍스트 위치 (숫자 아래)
TEXT_POSITION_NICKNAME = (150, 400)  # 닉네임 위치 (중앙 하단)
TEXT_POSITION_TIER = (150, 430)  # 등급 위치 (중앙 하단)
TEXT_COLOR = (255, 255, 255, 255)  # 흰색
TEXT_STROKE_COLOR = (0, 0, 0, 255)  # 검은색
TEXT_STROKE_WIDTH = 2

# 스킬 레벨 -> FIFA 레이팅 매핑
SKILL_RATING_MAP = {
    "루키": 60,
    "비기너": 70,
    "아마추어": 80,
    "세미프로": 90,
    "프로": 99
}

# rembg 세션 캐싱 (성능 최적화) - 지연 로딩
_rembg_session = None
_rembg_import_tried = False


def get_rembg_session():
    """
    rembg 세션 싱글톤 반환 (성능 최적화, 지연 로딩)

    Returns:
        rembg 세션 객체

    Raises:
        CardGenerationError: onnxruntime 미설치 시
    """
    global _rembg_session, _rembg_import_tried

    if _rembg_session is None and not _rembg_import_tried:
        try:
            _rembg_import_tried = True
            # 지연 로딩: 실제 사용 시에만 rembg 임포트
            from rembg import new_session
            _rembg_session = new_session("u2net")
            logger.info("rembg session initialized")
        except Exception as e:
            logger.error(f"Failed to initialize rembg session: {e}")
            raise CardGenerationError(f"배경 제거 세션 초기화 실패: {e}")

    if _rembg_session is None:
        raise CardGenerationError("배경 제거 세션을 초기화할 수 없습니다. rembg[cpu]를 설치하세요.")

    return _rembg_session


def sanitize_filename(name: str) -> str:
    """
    파일명에 안전한 문자열로 변환 (Path Traversal 방어)

    Args:
        name: 원본 문자열 (닉네임 등)

    Returns:
        안전한 파일명 문자열
    """
    # 1. 경로 구분자 및 위험 문자 제거
    safe_name = re.sub(r'[<>:"/\\|?*\x00-\x1f(){}[\]]', '', name)

    # 2. 연속 점 제거 (path traversal 방지: ../../../etc/passwd)
    safe_name = re.sub(r'\.{2,}', '.', safe_name)

    # 3. 시작/끝 점 제거
    safe_name = safe_name.strip('.')

    # 4. 최대 50자로 제한
    return safe_name[:50].strip()


def validate_image(uploaded_file) -> bool:
    """
    업로드된 이미지 파일 검증

    Args:
        uploaded_file: Streamlit UploadedFile 객체

    Returns:
        검증 통과 여부
    """
    try:
        # 파일 크기 체크
        if uploaded_file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
            logger.warning(f"Image too large: {uploaded_file.size} bytes")
            return False

        # 파일 포인터 초기화 (st.image() 등이 이미 읽었을 수 있음)
        uploaded_file.seek(0)

        # 이미지 형식 체크
        image = Image.open(uploaded_file)
        if image.format not in ALLOWED_FORMATS:
            logger.warning(f"Invalid format: {image.format}")
            return False

        return True
    except Exception as e:
        logger.error(f"Image validation error: {e}")
        return False


def remove_background(image: Image.Image) -> Image.Image:
    """
    rembg를 사용한 배경 제거 (세션 캐싱 적용)

    Args:
        image: PIL Image 객체

    Returns:
        배경이 제거된 PIL Image 객체 (RGBA)
    """
    try:
        # 지연 로딩: 실제 사용 시에만 rembg 임포트
        from rembg import remove

        # 캐시된 세션으로 배경 제거 (성능 향상)
        session = get_rembg_session()
        output = remove(image, session=session)

        # RGBA 모드로 변환
        if output.mode != 'RGBA':
            output = output.convert('RGBA')

        logger.info("Background removed successfully")
        return output
    except Exception as e:
        logger.error(f"Background removal error: {e}")
        raise CardGenerationError(f"배경 제거 실패: {e}")


def crop_and_resize_person(image: Image.Image) -> Image.Image:
    """
    인물 이미지를 크롭하고 리사이즈

    Args:
        image: 배경이 제거된 PIL Image (RGBA)

    Returns:
        크롭 및 리사이즈된 PIL Image
    """
    try:
        # 투명하지 않은 영역의 bounding box 찾기
        bbox = image.getbbox()

        if bbox:
            # 크롭
            cropped = image.crop(bbox)

            # 비율 유지하며 리사이즈
            cropped.thumbnail(PERSON_SIZE, Image.Resampling.LANCZOS)

            logger.info(f"Cropped and resized to {cropped.size}")
            return cropped
        else:
            # bbox가 없으면 원본 리사이즈
            image.thumbnail(PERSON_SIZE, Image.Resampling.LANCZOS)
            return image
    except Exception as e:
        logger.error(f"Crop and resize error: {e}")
        raise


def load_card_template(card_tier: str) -> Image.Image:
    """
    카드 템플릿 로드

    Args:
        card_tier: 카드 등급 (브론즈, 실버, 골드, 스페셜, 레전드)

    Returns:
        템플릿 PIL Image (RGBA)
    """
    try:
        template_path = CARD_TEMPLATES.get(card_tier)

        if not template_path or not os.path.exists(template_path):
            logger.warning(f"Template not found for {card_tier}, using default")
            template_path = CARD_TEMPLATES["브론즈"]

        template = Image.open(template_path).convert('RGBA')

        # 카드 크기로 리사이즈
        template = template.resize(CARD_SIZE, Image.Resampling.LANCZOS)

        logger.info(f"Loaded template: {card_tier}")
        return template
    except Exception as e:
        logger.error(f"Template load error: {e}")
        raise


def composite_person_on_card(template: Image.Image, person: Image.Image) -> Image.Image:
    """
    템플릿에 인물 이미지 합성

    Args:
        template: 카드 템플릿 (RGBA)
        person: 인물 이미지 (RGBA)

    Returns:
        합성된 PIL Image
    """
    try:
        # 새 이미지 생성 (템플릿 복사)
        card = template.copy()

        # 인물을 중앙 정렬하여 배치
        person_x = PERSON_POSITION[0] + (PERSON_SIZE[0] - person.width) // 2
        person_y = PERSON_POSITION[1] + (PERSON_SIZE[1] - person.height) // 2

        # 알파 채널을 마스크로 사용하여 합성
        card.paste(person, (person_x, person_y), person)

        logger.info("Person composited on card")
        return card
    except Exception as e:
        logger.error(f"Composite error: {e}")
        raise


def get_korean_font(size: int) -> ImageFont.FreeTypeFont:
    """
    크로스 플랫폼 한글 폰트 로드

    Args:
        size: 폰트 크기

    Returns:
        ImageFont.FreeTypeFont 객체

    Notes:
        - macOS, Windows, Linux (Streamlit Cloud) 지원
        - 폰트 로딩 실패 시 기본 폰트 반환 (한글 지원 안 될 수 있음)
    """
    font_paths = [
        # macOS
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        # Windows
        "C:\\Windows\\Fonts\\malgun.ttf",
        "C:\\Windows\\Fonts\\gulim.ttc",
        # Linux / Streamlit Cloud
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except (OSError, IOError) as e:
                logger.debug(f"Font loading failed for {path}: {e}")
                continue

    # 폴백: 기본 폰트 (한글 지원 안 될 수 있음)
    logger.warning(f"No Korean font found, using default font (size {size})")
    return ImageFont.load_default()


def add_text_overlay(
    image: Image.Image,
    nickname: str,
    card_tier: str,
    skill_level: str = "아마추어"
) -> Image.Image:
    """
    카드에 텍스트 오버레이 추가 (FIFA 스타일)

    Args:
        image: 합성된 카드 이미지
        nickname: 참가자 닉네임
        card_tier: 카드 등급
        skill_level: 스킬 레벨 (루키, 비기너, 아마추어, 세미프로, 프로)

    Returns:
        텍스트가 추가된 PIL Image
    """
    try:
        # 이미지 복사
        card = image.copy()
        draw = ImageDraw.Draw(card)

        # 한글 폰트 로드 (크로스 플랫폼)
        font_skill_rating = get_korean_font(48)  # 스킬 레이팅 (큰 숫자)
        font_large = get_korean_font(26)  # 닉네임 (굵게 표시용 크기 증가)
        font_medium = get_korean_font(16)  # 스킬 레벨 텍스트
        font_small = get_korean_font(14)  # 등급

        # 1. 스킬 레이팅 숫자 그리기 (좌측 상단, FIFA 스타일)
        skill_rating = SKILL_RATING_MAP.get(skill_level, 80)  # 기본값 80
        draw.text(
            TEXT_POSITION_SKILL_RATING,
            str(skill_rating),
            font=font_skill_rating,
            fill=TEXT_COLOR,
            stroke_width=3,
            stroke_fill=TEXT_STROKE_COLOR,
            anchor="mm"
        )

        # 2. 스킬 레벨 텍스트 그리기 (숫자 아래)
        draw.text(
            TEXT_POSITION_SKILL_LABEL,
            skill_level,
            font=font_medium,
            fill=TEXT_COLOR,
            stroke_width=2,
            stroke_fill=TEXT_STROKE_COLOR,
            anchor="mm"
        )

        # 3. 닉네임 그리기 (하단 중앙, 굵게)
        draw.text(
            TEXT_POSITION_NICKNAME,
            nickname,
            font=font_large,
            fill=TEXT_COLOR,
            stroke_width=3,  # 더 굵은 테두리로 강조
            stroke_fill=TEXT_STROKE_COLOR,
            anchor="mm"
        )

        # 4. 카드 등급 그리기 (닉네임 아래)
        draw.text(
            TEXT_POSITION_TIER,
            card_tier,
            font=font_small,
            fill=TEXT_COLOR,
            stroke_width=2,
            stroke_fill=TEXT_STROKE_COLOR,
            anchor="mm"
        )

        logger.info(f"Text added: {nickname} - {card_tier} - {skill_level} ({skill_rating})")
        return card
    except Exception as e:
        logger.error(f"Text overlay error: {e}")
        raise


def generate_player_card(
    uploaded_file,
    player_id: int,
    nickname: str,
    card_tier: str = "브론즈",
    skill_level: str = "아마추어"
) -> Tuple[Optional[str], Optional[str]]:
    """
    선수 카드 생성 (통합 함수)

    Args:
        uploaded_file: Streamlit UploadedFile 객체
        player_id: 참가자 ID
        nickname: 참가자 닉네임
        card_tier: 카드 등급 (기본: 브론즈)
        skill_level: 스킬 레벨 (기본: 아마추어)

    Returns:
        tuple: (card_path, profile_path) - 카드 경로, 프로필 경로 순서
               실패 시 (None, None)
    """
    try:
        # 디렉토리 생성
        os.makedirs(PROFILE_DIR, exist_ok=True)
        os.makedirs(CARD_DIR, exist_ok=True)

        # 1. 이미지 검증
        if not validate_image(uploaded_file):
            logger.error("Image validation failed")
            raise CardGenerationError("이미지 검증 실패")

        # 2. 이미지 로드
        uploaded_file.seek(0)  # 파일 포인터 초기화
        original_image = Image.open(uploaded_file).convert('RGBA')

        # 3. 안전한 파일명 생성 (Path Traversal 방어)
        safe_nickname = sanitize_filename(nickname)
        if not safe_nickname:
            # sanitize 후 빈 문자열이면 ID만 사용
            safe_nickname = str(player_id)
            logger.warning(f"Nickname sanitized to empty, using ID: {player_id}")

        # 4. 프로필 이미지 저장 (원본)
        profile_filename = f"player_{player_id}_profile.png"
        profile_path = os.path.join(PROFILE_DIR, profile_filename)
        original_image.save(profile_path, 'PNG')
        logger.info(f"Profile saved: {profile_path}")

        # 5. 배경 제거
        no_bg_image = remove_background(original_image)

        # 6. 크롭 및 리사이즈
        person_image = crop_and_resize_person(no_bg_image)

        # 7. 템플릿 로드
        template = load_card_template(card_tier)

        # 8. 합성
        card_image = composite_person_on_card(template, person_image)

        # 9. 텍스트 오버레이 (스킬 레벨 포함)
        final_card = add_text_overlay(card_image, nickname, card_tier, skill_level)

        # 10. 카드 저장
        card_filename = f"player_{player_id}_card.png"
        card_path = os.path.join(CARD_DIR, card_filename)
        final_card.save(card_path, 'PNG')
        logger.info(f"Card saved: {card_path}")

        # 반환 순서: (card_path, profile_path)
        return card_path, profile_path

    except CardGenerationError:
        # 이미 로그된 에러는 다시 raise
        raise
    except Exception as e:
        logger.error(f"Card generation failed: {e}")
        raise CardGenerationError(f"카드 생성 실패: {e}")


def regenerate_card_with_new_tier(
    player_id: int,
    nickname: str,
    new_tier: str,
    profile_path: str,
    skill_level: str = "아마추어"
) -> Optional[str]:
    """
    기존 프로필 이미지로 새 등급의 카드 재생성

    Args:
        player_id: 참가자 ID
        nickname: 참가자 닉네임
        new_tier: 새로운 카드 등급
        profile_path: 기존 프로필 이미지 경로
        skill_level: 스킬 레벨 (기본: 아마추어)

    Returns:
        새 카드 이미지 경로 또는 None
    """
    try:
        # 프로필 이미지 로드
        if not os.path.exists(profile_path):
            logger.error(f"Profile image not found: {profile_path}")
            raise CardGenerationError(f"프로필 이미지 없음: {profile_path}")

        original_image = Image.open(profile_path).convert('RGBA')

        # 배경 제거 (캐싱된 세션 사용)
        no_bg_image = remove_background(original_image)

        # 크롭 및 리사이즈
        person_image = crop_and_resize_person(no_bg_image)

        # 새 등급 템플릿 로드
        template = load_card_template(new_tier)

        # 합성
        card_image = composite_person_on_card(template, person_image)

        # 텍스트 오버레이 (스킬 레벨 포함)
        final_card = add_text_overlay(card_image, nickname, new_tier, skill_level)

        # 안전한 파일명으로 카드 저장 (ID만 사용)
        card_filename = f"player_{player_id}_card.png"
        card_path = os.path.join(CARD_DIR, card_filename)
        final_card.save(card_path, 'PNG')

        logger.info(f"Card regenerated with tier {new_tier}: {card_path}")
        return card_path

    except CardGenerationError:
        raise
    except Exception as e:
        logger.error(f"Card regeneration failed: {e}")
        raise CardGenerationError(f"카드 재생성 실패: {e}")
