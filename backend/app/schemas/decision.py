from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class JointPreferenceIn(BaseModel):
    places: list[str] = []
    activities: list[str] = []
    foods: list[str] = []
    pace: int = 50
    budget: int = 50
    indoor_preferred: bool = False
    hidden_spots: bool = False

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class JointPreferenceOut(JointPreferenceIn):
    pass


class ConflictRequest(BaseModel):
    conflicts: list[str]


class ConflictResponse(BaseModel):
    suggestion: str
