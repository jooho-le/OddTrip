from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class SafetyAlertOut(BaseModel):
    id: str
    level: str
    title: str
    message: str | None = None
    action: str | None = None
    time: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
