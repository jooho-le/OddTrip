import { describe, expect, it } from 'vitest';
import { coordinationFlowState, isTripPlanningReadOnly } from './coordinationFlow';

describe('coordinationFlowState', () => {
  it('keeps each user in preference submission until both answers exist', () => {
    expect(coordinationFlowState({ mineSubmitted: false, counterpartSubmitted: false, itineraryReady: false, generating: false }).currentIndex).toBe(1);
    expect(coordinationFlowState({ mineSubmitted: true, counterpartSubmitted: false, itineraryReady: false, generating: false }).currentIndex).toBe(1);
  });

  it('moves directly from two submitted preferences to AI itinerary generation', () => {
    const generating = coordinationFlowState({ mineSubmitted: true, counterpartSubmitted: true, itineraryReady: false, generating: true });
    expect(generating.currentIndex).toBe(1);
    expect(generating.current).toContain('AI');
    expect(generating.next).toContain('일정표');
  });

  it('marks a generated itinerary as read only without an approval step', () => {
    expect(isTripPlanningReadOnly('confirmed', false)).toBe(true);
    expect(isTripPlanningReadOnly('planning', true)).toBe(true);
    expect(isTripPlanningReadOnly('planning', false)).toBe(false);
  });

  it('ends the flow at the itinerary', () => {
    const completed = coordinationFlowState({ mineSubmitted: true, counterpartSubmitted: true, itineraryReady: true, generating: false });
    expect(completed.currentIndex).toBe(2);
    expect(completed.current).toContain('일정');
  });
});
