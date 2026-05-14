from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class UserCreate(BaseModel):
    nickname: str
    avatar_url: str | None = None
    home_region: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserUpdate(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None
    home_region: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserOut(BaseModel):
    id: str
    nickname: str
    avatar_url: str | None = None
    home_region: str | None = None
    tti_code: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
