from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AttractionOut(BaseModel):
    id: str
    name: str
    category: str
    image_url: str | None = None
    description: str | None = None
    reason: str | None = None
    tags: list[str] = []
    indoor: bool = False
    active: bool = False
    famous: bool = False
    saved: bool = False
    excluded: bool = False
    content_id: str | None = None
    content_type_id: str | None = None
    source: str | None = None
    addr1: str | None = None
    addr2: str | None = None
    map_x: str | None = None
    map_y: str | None = None
    area_code: str | None = None
    sigungu_code: str | None = None
    tel: str | None = None
    homepage: str | None = None
    opening_hours: dict | None = None
    closed_days: list[str] = []
    congestion_score: int | None = None
    hidden_score: int | None = None
    related_rank: int | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AttractionToggle(BaseModel):
    saved: bool | None = None
    excluded: bool | None = None


class PublicAttractionGenerateRequest(BaseModel):
    area_code: str = "1"
    sigungu_code: str | None = None
    keywords: list[str] = []
    content_type_ids: list[str] = []
    rows_per_type: int = 12
    limit: int = 8

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
