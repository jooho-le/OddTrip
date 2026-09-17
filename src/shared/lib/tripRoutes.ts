export type TripWorkspaceTab = 'overview' | 'coordination' | 'schedule';

function tripSegment(tripId: string) {
  return encodeURIComponent(tripId);
}

export function tripWorkspacePath(tripId: string, tab: TripWorkspaceTab = 'overview') {
  return `/trips/${tripSegment(tripId)}/${tab}`;
}

export function tripSettingsPath(tripId: string) {
  return `/trips/${tripSegment(tripId)}/settings`;
}

export function tripScheduleMapPath(tripId: string) {
  return `/trips/${tripSegment(tripId)}/schedule/map`;
}

export function tripPreferencePath(tripId: string, fromHome = false) {
  return `/trips/${tripSegment(tripId)}/survey/preference${fromHome ? '?from=home' : ''}`;
}
