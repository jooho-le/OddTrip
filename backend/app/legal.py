"""Legal document versions and the consent types tied to them.

The server, not the client, decides which version of a document is currently
in force. A client running a stale bundle may still be showing last month's
terms; if it were allowed to declare its own version, that consent would be
filed as if the user had read the current text. So every submission carries
the version it displayed and is rejected when it does not match.
"""

# Consent types. The string is what lands in the database, so it is part of
# the stored legal record and must not be renamed once rows exist.
TERMS = "terms"
COMMUNITY = "community"
ADULT = "adult"
PRIVACY_NOTICE = "privacy_notice"
MARKETING = "marketing"
MATCHING_PROFILE = "matching_profile"
SAFETY_GUIDE = "safety_guide"

# Where the consent was collected. Descriptive metadata for operations, not a
# part of the legal record itself.
SOURCE_SIGNUP = "signup"
SOURCE_MATCHING_GATE = "matching_gate"
SOURCE_SETTINGS = "settings"
SOURCES = (SOURCE_SIGNUP, SOURCE_MATCHING_GATE, SOURCE_SETTINGS)

# The version of each document that is currently in force. Raising one of
# these makes every consent recorded against the old string stale, which is
# what drives the re-consent prompt. The documents still carry effective-date
# and operator placeholders, hence "draft".
CURRENT_VERSIONS: dict[str, str] = {
    TERMS: "draft-2026-09-07",
    COMMUNITY: "draft-2026-09-07",
    ADULT: "draft-2026-09-07",
    PRIVACY_NOTICE: "draft-2026-09-07",
    MARKETING: "draft-2026-09-07",
    MATCHING_PROFILE: "draft-2026-09-07",
    SAFETY_GUIDE: "draft-2026-09-13",
}

CONSENT_TYPES = tuple(CURRENT_VERSIONS)

# Registration cannot complete without all four. The privacy notice is an
# acknowledgement rather than a consent -- the lawful basis for processing
# signup data is performance of the service contract -- but it is still
# recorded, because we have to be able to show it was put in front of the user.
REGISTRATION_REQUIRED = (TERMS, COMMUNITY, ADULT, PRIVACY_NOTICE)
REGISTRATION_OPTIONAL = (MARKETING,)
REGISTRATION_TYPES = REGISTRATION_REQUIRED + REGISTRATION_OPTIONAL

# Consents the user can withdraw on their own. The rest are preconditions for
# using the service at all, so they are given up by closing the account, not
# by toggling a switch.
REVOCABLE = (MARKETING,)

# Gates that must be accepted at the current version before the matching
# surface opens: the profile disclosure consent and the safety briefing.
MATCHING_GATES = (MATCHING_PROFILE, SAFETY_GUIDE)
