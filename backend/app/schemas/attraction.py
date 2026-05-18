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
