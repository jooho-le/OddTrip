from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TtiQuestionOut(BaseModel):
    id: str
    axis: str
    prompt: str
    left_label: str
    right_label: str
    left_letter: str
    right_letter: str

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class TtiAnswerIn(BaseModel):
    question_id: str
    axis: str
    value: int

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TtiCalculateRequest(BaseModel):
    answers: list[TtiAnswerIn]


class AxisScoreOut(BaseModel):
    axis: str
    left_letter: str
    right_letter: str
    score: int

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TtiResultOut(BaseModel):
    code: str
    opposite_code: str
    title: str
    description: str
    strengths: list[str]
    axis_scores: list[AxisScoreOut]

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TravelTypeOut(BaseModel):
    code: str
    title: str
    description: str
    keywords: list[str]

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
