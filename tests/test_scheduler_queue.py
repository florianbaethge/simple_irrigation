"""Scheduled starts wait instead of disappearing while irrigation is busy."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from custom_components.simple_irrigation.scheduler import IrrigationScheduler


class _FakeHass:
    def async_create_task(self, coro):
        return asyncio.create_task(coro)


class _ControlledRuntime:
    """Runtime whose active run advances only when the test releases it."""

    def __init__(self) -> None:
        self._finished = asyncio.Event()
        self.started: list[tuple[list[list[str]], list[str]]] = []

    def is_busy(self) -> bool:
        return not self._finished.is_set()

    async def async_wait_for_current_run(self) -> None:
        await self._finished.wait()

    async def async_run_phases(
        self,
        phases,
        *,
        scheduled: bool,
        slot_ids: list[str],
        duration_overrides=None,
    ) -> bool:
        assert scheduled
        self.started.append((phases, slot_ids))
        self._finished = asyncio.Event()
        return True

    def finish(self) -> None:
        self._finished.set()


async def _wait_for_count(runtime: _ControlledRuntime, count: int) -> None:
    for _ in range(20):
        if len(runtime.started) >= count:
            return
        await asyncio.sleep(0)
    raise AssertionError(f"expected {count} queued runs, got {len(runtime.started)}")


def test_scheduled_runs_drain_in_fifo_order_after_busy_run() -> None:
    async def scenario() -> None:
        runtime = _ControlledRuntime()
        scheduler = IrrigationScheduler(
            _FakeHass(),
            SimpleNamespace(),
            runtime,
        )

        scheduler._queue_scheduled_run([["z1"]], ["slot-1"])
        scheduler._queue_scheduled_run([["z2"]], ["slot-2"])
        await asyncio.sleep(0)
        assert runtime.started == []

        runtime.finish()
        await _wait_for_count(runtime, 1)
        assert runtime.started[0][1] == ["slot-1"]

        runtime.finish()
        await _wait_for_count(runtime, 2)
        assert runtime.started[1][1] == ["slot-2"]
        assert scheduler._pending_runs == []

    asyncio.run(scenario())
