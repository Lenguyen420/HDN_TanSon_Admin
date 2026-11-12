import test from "node:test";
import assert from "node:assert/strict";
import { beginForegroundWork, createBackgroundPoller } from "../services/background-polling.ts";

test("background calls wait 60 seconds, share wakeups, and pause while saving", async t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"] });
  let calls = 0, visible = true;
  const poller = createBackgroundPoller(async () => { calls++; }, () => visible);
  await poller.refresh(); assert.equal(calls, 1);
  for (let i = 0; i < 20; i++) await poller.refresh();
  t.mock.timers.tick(5000); await Promise.resolve(); assert.equal(calls, 1);
  const end = beginForegroundWork();
  t.mock.timers.tick(60000); await Promise.resolve(); assert.equal(calls, 1);
  end(); end(); // cleanup is idempotent
  t.mock.timers.tick(60000); await Promise.resolve(); assert.equal(calls, 2);
  visible = false;
  t.mock.timers.tick(60000); await Promise.resolve(); assert.equal(calls, 2);
  poller.stop(); visible = true;
  t.mock.timers.tick(60000); await poller.refresh(); assert.equal(calls, 2);
});
test("slow background requests never overlap or queue focus requests", async t => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"] });
  let calls = 0, release!: () => void;
  const poller = createBackgroundPoller(async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); }, () => true);
  const pending = poller.refresh();
  t.mock.timers.tick(180000); await poller.refresh(); assert.equal(calls, 1);
  release(); await pending;
  t.mock.timers.tick(59000); assert.equal(calls, 1);
  poller.stop();
});
