from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class MatchCandidateOut(BaseModel):
    id: str
    nickname: str
    age_range: str
    region: str
    avatar_url: str | None = None
    tti_code: str
    summary: str
    compatibility: str
    match_level: str
    recommendation_score: int
    differences: list[str]
    complements: list[str]

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
