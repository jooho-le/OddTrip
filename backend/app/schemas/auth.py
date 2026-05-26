from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

from .user import UserOut


class AuthRegisterIn(BaseModel):
    email: str
    password: str
    nickname: str
    home_region: str | None = None
    avatar_url: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("올바른 이메일을 입력해주세요.")
        return email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not (8 <= len(value) <= 128):
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return value

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: str) -> str:
        nickname = value.strip()
        if not nickname:
            raise ValueError("닉네임을 입력해주세요.")
        if len(nickname) > 50:
            raise ValueError("닉네임은 50자 이하로 입력해주세요.")
        return nickname


class AuthLoginIn(BaseModel):
    email: str
    password: str

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
