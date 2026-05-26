from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class JointPreferenceIn(BaseModel):
    places: list[str] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    foods: list[str] = Field(default_factory=list)
    pace: int = 50
    budget: int = 50
    indoor_preferred: bool = False
    hidden_spots: bool = False

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class JointPreferenceOut(JointPreferenceIn):
    pass


class ConflictRequest(BaseModel):
    conflicts: list[str] = Field(default_factory=list)


class ConflictResponse(BaseModel):
    suggestion: str
