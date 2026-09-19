from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from ..models.community import CATEGORIES

# 작성 화면과 같은 한도. 화면 검증을 믿고 서버에서 빼면, 화면을 거치지 않는
# 요청이 그대로 들어온다. 문구도 화면과 맞춰 두어야 사용자가 같은 말을 본다.
TITLE_MAX = 80
BODY_MIN = 10
BODY_MAX = 10_000
REGION_MAX = 30
TAG_MAX = 20
TAGS_MAX = 5
CAPTION_MAX = 150
COMMENT_MAX = 1_000
IMAGE_URL_MAX = 500
# 화면이 허용하는 사진은 800KB 이하 한 장이고, data URL로 오면 base64라
# 원본보다 약 4/3로 길어진다. 여유를 조금 두고 그 길이에서 끊는다.
IMAGE_DATA_MAX = 1_200_000
IMAGE_MIME_PREFIXES = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")


class CommunityModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


def _clean_category(value: str) -> str:
    if value not in CATEGORIES:
        raise ValueError("카테고리를 선택해 주세요.")
    return value


def _clean_region(value: str | None) -> str | None:
    region = (value or "").strip()
    if len(region) > REGION_MAX:
        raise ValueError(f"여행 지역은 {REGION_MAX}자까지 입력할 수 있어요.")
    return region or None


def _clean_tags(value: list[str] | None) -> list[str]:
    tags: list[str] = []
    for tag in value or []:
        cleaned = tag.strip().lstrip("#").strip()
        if not cleaned or cleaned in tags:
            continue
        tags.append(cleaned)
    if len(tags) > TAGS_MAX or any(len(tag) > TAG_MAX for tag in tags):
        raise ValueError(f"태그는 각 {TAG_MAX}자, 최대 {TAGS_MAX}개까지 입력해 주세요.")
    return tags


def _clean_image(value: str | None) -> str | None:
    image = (value or "").strip()
    if not image:
        return None
    if image.startswith("data:"):
        if not image.startswith(IMAGE_MIME_PREFIXES):
            raise ValueError("사진은 JPG·PNG·WebP 형식으로 첨부해 주세요.")
        if len(image) > IMAGE_DATA_MAX:
            raise ValueError("사진은 800KB 이하로 첨부해 주세요.")
        return image
    if image.startswith("https://") or image.startswith("http://"):
        if len(image) > IMAGE_URL_MAX:
            raise ValueError("사진 주소가 너무 깁니다.")
        return image
    raise ValueError("첨부한 사진을 읽을 수 없습니다.")


def _clean_caption(value: str | None) -> str | None:
    caption = (value or "").strip()
    if len(caption) > CAPTION_MAX:
        raise ValueError(f"사진 설명은 {CAPTION_MAX}자까지 입력할 수 있어요.")
    return caption or None


class CommunityInputModel(CommunityModel):
    """작성 화면이 보내는 공통 항목의 검증.

    게시와 임시저장은 같은 편집기를 쓰므로 카테고리·지역·태그·사진 규칙이 같다.
    다른 것은 제목과 본문을 완성해야 하는지 뿐이라 그 둘만 각자 확인한다.
    """

    @field_validator("category", check_fields=False)
    @classmethod
    def validate_category(cls, value: str) -> str:
        return _clean_category(value)

    @field_validator("region", check_fields=False)
    @classmethod
    def validate_region(cls, value: str | None) -> str | None:
        return _clean_region(value)

    @field_validator("tags", check_fields=False)
    @classmethod
    def validate_tags(cls, value: list[str] | None) -> list[str]:
        return _clean_tags(value)

    @field_validator("image", check_fields=False)
    @classmethod
    def validate_image(cls, value: str | None) -> str | None:
        return _clean_image(value)

    @field_validator("image_caption", check_fields=False)
    @classmethod
    def validate_caption(cls, value: str | None) -> str | None:
        return _clean_caption(value)


class CommunityPostIn(CommunityInputModel):
    """작성 완료와 수정이 보내는 본문. 초안과 달리 게시 가능한 상태여야 한다."""

    title: str = Field(max_length=TITLE_MAX)
    body: str = Field(max_length=BODY_MAX)
    category: str
    region: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=TAGS_MAX * 2)
    image: str | None = None
    image_caption: str | None = None
    allow_comments: bool = True
    # "이 여행으로 글쓰기"에서 시작한 글이 어느 여행에서 나왔는지. 보내지 않아도 된다.
    trip_id: str | None = Field(default=None, max_length=36)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        title = value.strip()
        if not title or len(title) > TITLE_MAX:
            raise ValueError(f"제목을 1~{TITLE_MAX}자로 작성해 주세요.")
        return title

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        if len(value.strip()) < BODY_MIN or len(value) > BODY_MAX:
            raise ValueError(f"본문을 {BODY_MIN}~{BODY_MAX:,}자로 작성해 주세요.")
        return value.strip()


class CommunityDraftIn(CommunityInputModel):
    """임시저장이 보내는 본문.

    초안은 아직 완성되지 않은 글이다. 제목이 비었다고 거절하면 화면의
    임시저장 버튼이 쓸모없어지므로, 여기서는 길이 상한만 확인한다.
    """

    title: str = Field(default="", max_length=TITLE_MAX)
    body: str = Field(default="", max_length=BODY_MAX)
    category: str = CATEGORIES[0]
    region: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=TAGS_MAX * 2)
    image: str | None = None
    image_caption: str | None = None
    allow_comments: bool = True


class CommunityCommentIn(CommunityModel):
    body: str = Field(max_length=COMMENT_MAX)

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        body = value.strip()
        if not body:
            raise ValueError(f"댓글을 1~{COMMENT_MAX:,}자로 작성해 주세요.")
        return body


class CommunityReactionIn(CommunityModel):
    """공감·저장을 켜고 끄는 요청.

    화면은 토글이지만 계약은 "원하는 상태"를 받는다. 같은 요청이 두 번 닿아도
    결과가 같아야 연타나 재시도에 공감이 뒤집히지 않는다.
    """

    value: bool


class CommunityAuthorOut(CommunityModel):
    id: str
    nickname: str
    avatar_url: str | None = None


class CommunityCommentOut(CommunityModel):
    id: str
    post_id: str
    author: CommunityAuthorOut
    body: str
    created_at: datetime
    mine: bool = False


class CommunityPostOut(CommunityModel):
    id: str
    author: CommunityAuthorOut
    trip_id: str | None = None
    category: str
    title: str
    body: str
    region: str | None = None
    tags: list[str] = Field(default_factory=list)
    image: str | None = None
    image_caption: str | None = None
    allow_comments: bool = True
    # 공감 수는 내 공감을 포함한 전체다. liked는 그중 내 상태다.
    like_count: int = 0
    comment_count: int = 0
    liked: bool = False
    saved: bool = False
    mine: bool = False
    created_at: datetime
    updated_at: datetime
    # 목록에서는 비우고 상세에서만 채운다.
    comments: list[CommunityCommentOut] | None = None


class CommunityPostPageOut(CommunityModel):
    items: list[CommunityPostOut]
    page: int
    size: int
    total: int
    total_pages: int


class CommunityReactionOut(CommunityModel):
    post_id: str
    like_count: int
    liked: bool
    saved: bool


class CommunityDraftOut(CommunityModel):
    draft_key: str
    title: str
    body: str
    category: str
    region: str | None = None
    tags: list[str] = Field(default_factory=list)
    image: str | None = None
    image_caption: str | None = None
    allow_comments: bool = True
    updated_at: datetime
