from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ConsentModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ConsentDecisionIn(ConsentModel):
    """One checkbox the user acted on.

    ``version`` is the document version the client actually rendered. It is
    checked against the version in force rather than trusted, so a stale
    client is told to reload instead of having its user filed as having
    accepted text they never saw.
    """

    type: str
    version: str
    accepted: bool = True


class ConsentSubmitIn(ConsentModel):
    consents: list[ConsentDecisionIn] = Field(min_length=1, max_length=20)
    source: str


class ConsentOut(ConsentModel):
    """One row of the ledger."""

    type: str
    version: str
    accepted: bool
    source: str
    accepted_at: datetime


class ConsentStateOut(ConsentModel):
    """The standing answer for one consent type.

    ``accepted`` means accepted at the version currently in force, so reading
    that field alone is already the safe check. ``stale`` explains the case
    where it is false only because the document moved on: the user did accept,
    but an earlier revision, so they owe a re-consent rather than a first ask.
    """

    type: str
    accepted: bool
    version: str | None = None
    current_version: str
    stale: bool
    accepted_at: datetime | None = None


class ConsentStatusOut(ConsentModel):
    items: list[ConsentStateOut]
    # Types the user may withdraw on their own.
    revocable: list[str]


class ConsentHistoryOut(ConsentModel):
    items: list[ConsentOut]
