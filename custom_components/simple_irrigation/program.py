"""Turn a slot's phases into the steps a run walks through.

A run is a queue of steps. Most steps are a *phase*: the zone ids that water in
parallel. With Cycle & Soak a slot also puts *soaks* into the queue — rests
between phases and between repetitions — so the runtime needs no second code
path for repeated slots: it pops steps and either waters or waits.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TypeAlias

from .models import ScheduleSlot


@dataclass(frozen=True)
class Soak:
    """A rest in the queue: outputs stay closed for ``seconds``."""

    seconds: int


RunStep: TypeAlias = list[str] | Soak


def is_soak(step: object) -> bool:
    """Whether a queue entry is a rest rather than a phase."""
    return isinstance(step, Soak)


def expand_program(phases: list[list[str]], slot: ScheduleSlot) -> list[RunStep]:
    """The steps one slot runs: its phases repeated, with soaks in between.

    Between two phases of the same pass ``soak_between_phases_min`` applies,
    between the last phase of one pass and the first of the next
    ``soak_between_repetitions_min``. A soak of 0 minutes is left out, and a
    program never ends on a soak — nothing would be waiting for it.
    """
    if not phases:
        return []
    repetitions = max(1, slot.repetitions)
    between_phases = max(0, slot.soak_between_phases_min) * 60
    between_passes = max(0, slot.soak_between_repetitions_min) * 60

    steps: list[RunStep] = []
    for pass_index in range(repetitions):
        if pass_index > 0 and between_passes > 0:
            steps.append(Soak(between_passes))
        for phase_index, phase in enumerate(phases):
            if phase_index > 0 and between_phases > 0:
                steps.append(Soak(between_phases))
            steps.append(list(phase))
    return steps


def watering_steps(steps: list[RunStep]) -> list[list[str]]:
    """Only the phases of a queue, in order — what the UI lists as upcoming."""
    return [list(step) for step in steps if not isinstance(step, Soak)]


def soak_minutes(phase_count: int, slot: ScheduleSlot) -> int:
    """Total minutes a slot rests, for duration estimates."""
    if phase_count <= 0:
        return 0
    repetitions = max(1, slot.repetitions)
    per_pass = max(0, phase_count - 1) * max(0, slot.soak_between_phases_min)
    return repetitions * per_pass + (repetitions - 1) * max(
        0, slot.soak_between_repetitions_min
    )
