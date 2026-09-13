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


class UserWithdrawIn(BaseModel):
    """계정 삭제 확인.

    비밀번호를 다시 받는 이유는 되돌릴 수 없는 동작이기 때문입니다. 자리를
    비운 사이 열려 있던 화면이나 탈취된 세션으로 계정이 지워지는 것을
    막습니다. 비밀번호가 없는 계정(데모 헤더 인증)은 확인할 대상이 없어
    생략합니다.
    """

    password: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserOut(BaseModel):
    id: str
    email: str | None = None
    nickname: str
    avatar_url: str | None = None
    home_region: str | None = None
    role: str = "user"
    tti_code: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
