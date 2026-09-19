from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from .consent import ConsentDecisionIn
from .user import UserOut


class AuthRegisterIn(BaseModel):
    email: str
    password: str
    nickname: str
    home_region: str | None = None
    avatar_url: str | None = None
    # The signup consents, carried on the registration call rather than sent
    # afterwards: they are a condition of the contract being formed, so they
    # have to commit with the account or not at all. The required set is
    # enforced in the router against app.legal.REGISTRATION_REQUIRED.
    consents: list[ConsentDecisionIn] = Field(default_factory=list, max_length=20)

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
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RefreshIn(BaseModel):
    refresh_token: str

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not (8 <= len(value) <= 128):
            raise ValueError("새 비밀번호는 8자 이상이어야 합니다.")
        return value


class PasswordResetRequestIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("올바른 이메일을 입력해주세요.")
        return email


class PasswordResetConfirmIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not (8 <= len(value) <= 128):
            raise ValueError("새 비밀번호는 8자 이상이어야 합니다.")
        return value
