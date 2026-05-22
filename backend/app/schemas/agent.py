from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AgentRunRequest(BaseModel):
    area_code: str = "1"
    sigungu_code: str | None = None
    keywords: list[str] = Field(default_factory=list)
    content_type_ids: list[str] = Field(default_factory=list)
    days: int = 3
    budget: int = 50
    pace: int = 50

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AgentToolStep(BaseModel):
    tool: str
    reason: str
    args: dict[str, Any] = Field(default_factory=dict)
    result_count: int = 0

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AgentRunResponse(BaseModel):
    mode: str
    summary: str
    steps: list[AgentToolStep]
    recommended_attraction_ids: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
