"""운영 CLI.

사용법 (repo 루트에서):

    python -m backend.app.cli list
    python -m backend.app.cli promote admin@example.com
    python -m backend.app.cli demote admin@example.com
    python -m backend.app.cli reminders

설정된 DATABASE_URL을 그대로 쓰므로, 실행하는 환경의 DB에 반영된다.

``reminders``는 여행 시작 하루 전 알림을 보낸다. 앱 안의 스케줄러와 같은 일을
하며 멱등하므로, cron에 걸어 두고 앱 스케줄러를 꺼도 되고 둘 다 켜 두어도 된다.
"""
import argparse
import asyncio
import sys

from .config import settings
from .database import async_session
from .services import admin_service, notification_service, reminder_service


async def _run(command: str, email: str | None) -> int:
    async with async_session() as session:
        try:
            if command == "reminders":
                notifications = await reminder_service.send_due_reminders(
                    session, send_hour=settings.reminder_send_hour_kst
                )
                await notification_service.push(notifications)
                print(f"여행 D-1 리마인더 {len(notifications)}건을 보냈습니다.")
                return 0

            if command == "list":
                admins = await admin_service.list_admins(session)
                if not admins:
                    print("관리자 계정이 없습니다.")
                    return 0
                for user in admins:
                    print(f"{user.email}\t{user.nickname}\t{user.id}")
                return 0

            if command == "promote":
                user = await admin_service.promote(session, email)
                print(f"관리자로 지정했습니다: {user.email} ({user.nickname})")
                return 0

            user = await admin_service.demote(session, email)
            print(f"관리자 권한을 회수했습니다: {user.email} ({user.nickname})")
            return 0
        except admin_service.AdminRoleError as error:
            print(str(error), file=sys.stderr)
            return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="OddTrip 운영 명령")
    parser.add_argument("command", choices=["list", "promote", "demote", "reminders"])
    parser.add_argument("email", nargs="?", help="promote/demote에 필요한 계정 이메일")
    args = parser.parse_args()

    if args.command in {"promote", "demote"} and not args.email:
        parser.error(f"{args.command}에는 이메일이 필요합니다.")

    return asyncio.run(_run(args.command, args.email))


if __name__ == "__main__":
    raise SystemExit(main())
