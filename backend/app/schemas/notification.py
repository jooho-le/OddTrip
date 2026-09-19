from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class NotificationModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class NotificationOut(NotificationModel):
    id: str
    type: str
    title: str
    body: str | None = None
    link: str | None = None
    payload: dict | None = None
    read: bool = False
    read_at: datetime | None = None
    created_at: datetime


class NotificationPageOut(NotificationModel):
    items: list[NotificationOut]
    next_before: datetime | None = None


class NotificationUnreadCountOut(NotificationModel):
    count: int


class NotificationReadIn(NotificationModel):
    # Omitted or null marks every unread notification as read. An explicit list
    # marks only those, so the client can dismiss one row without clearing the
    # rest of the tray.
    notification_ids: list[str] | None = Field(default=None, max_length=200)


class NotificationReadOut(NotificationModel):
    updated: int
    unread_count: int
