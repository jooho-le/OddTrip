"""공유 중인 위치 좌표를 담아 두는 자리.

좌표는 DB에 넣지 않는다. 두 가지 이유다. 20초마다 들어오는 값을 전부 쌓으면
하루에 수천 행이 되는데 정작 필요한 것은 "지금 어디 있는가" 하나이고, 위치
이력은 보관 자체가 위험 부담이다. 그래서 최신 한 점만 들고 있다가 시간이
지나면 버린다.

프로세스 메모리라 서버를 다시 띄우면 비고, 인스턴스가 여러 대면 공유되지 않는다.
지금 배포는 한 대이고 좌표는 어차피 몇 초 뒤면 새로 들어오므로 문제가 되지
않는다. 인스턴스를 늘릴 때 이 클래스 뒤를 Redis로 바꾸면 된다. 채팅 연결
관리(``chat_manager``)와 같은 구조다.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta

# 두 개의 선이 필요하다. 하나는 "실시간이 아니다"라고 알릴 시점이고, 다른 하나는
# 좌표를 아예 버릴 시점이다. 한 숫자로 묶으면 지하철에서 잠깐 끊겼을 뿐인데
# 마지막 위치까지 사라져, 받는 사람이 아무것도 못 보게 된다.
#
# 좌표는 20초마다 올라오므로 1분은 세 번 연속 실패한 상태다. 그 정도면 멈췄다고
# 봐도 된다. 그 뒤로도 10분까지는 "마지막으로 있던 곳"을 남겨 둔다. 안전 기능에서
# 마지막 목격 지점은 실시간 위치만큼이나 쓸모가 있다.
STALE_AFTER = timedelta(minutes=1)
RETENTION = timedelta(minutes=10)


@dataclass(frozen=True)
class Position:
    latitude: float
    longitude: float
    accuracy: float | None
    at: datetime


class LocationCache:
    def __init__(self) -> None:
        self._positions: dict[str, Position] = {}

    def put(self, share_id: str, position: Position) -> None:
        self._positions[share_id] = position

    def get(self, share_id: str, *, now: datetime) -> Position | None:
        position = self._positions.get(share_id)
        if position is None:
            return None
        if now - position.at > RETENTION:
            # 만료된 좌표는 읽는 김에 버린다. 청소 전용 작업을 따로 돌리지
            # 않아도 공유가 끝난 좌표는 이 경로로 사라진다.
            self._positions.pop(share_id, None)
            return None
        return position

    def drop(self, share_id: str) -> None:
        """공유가 끝나면 좌표도 즉시 지운다."""
        self._positions.pop(share_id, None)


location_cache = LocationCache()
