from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


ConcessionChoice = Literal["keep", "flexible", "yield"]
CONCESSION_KEYS = {"pace", "budget", "food", "activities"}


class ConcessionSubmissionIn(BaseModel):
    answers: dict[str, ConcessionChoice] = Field(default_factory=dict, max_length=4)
    note: str | None = Field(default=None, max_length=500)
    submit: bool = False

    @field_validator("answers")
    @classmethod
    def validate_keys(cls, value: dict[str, ConcessionChoice]) -> dict[str, ConcessionChoice]:
        unknown = set(value) - CONCESSION_KEYS
        if unknown:
            raise ValueError("지원하지 않는 양보 범위 항목입니다.")
        return value

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def complete_when_submitted(self) -> "ConcessionSubmissionIn":
        if self.submit and set(self.answers) != CONCESSION_KEYS:
            raise ValueError("제출하려면 양보 범위 네 항목에 모두 답해주세요.")
        return self

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class OddRuleProposalIn(BaseModel):
    rule_key: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9_-]+$")
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=500)

    @field_validator("title", "description")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("규칙 내용을 입력해주세요.")
        return normalized

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
