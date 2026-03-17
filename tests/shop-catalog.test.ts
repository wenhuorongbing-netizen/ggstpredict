import test from "node:test";
import assert from "node:assert/strict";

import { ECONOMY_BASELINE, SHOP_ITEMS, getHoldingCount, getShopItem } from "../lib/shop-catalog";

test("economy baseline remains 1000 W$", () => {
  assert.equal(ECONOMY_BASELINE, 1000);
});

test("shop catalog exposes Epic 29 item prices", () => {
  assert.equal(getShopItem("fd_shield")?.cost, 100);
  assert.equal(getShopItem("fatal_counter")?.cost, 300);
  assert.equal(getShopItem("robbie_hex")?.cost, 1500);
  assert.equal(getShopItem("salt_megaphone")?.cost, 100);
});

test("shop catalog only exposes implemented Epic 29 items", () => {
  assert.deepEqual(
    SHOP_ITEMS.map((item) => item.id),
    ["fd_shield", "fatal_counter", "robbie_hex", "salt_megaphone"],
  );
});

test("holding counts map to the right inventory buckets", () => {
  const inventory = {
    fdShields: 2,
    fatalCounters: 3,
    robbieHexes: 1,
    activeMegaphones: 4,
  };

  assert.equal(getHoldingCount(inventory, "fd_shield"), 2);
  assert.equal(getHoldingCount(inventory, "fatal_counter"), 3);
  assert.equal(getHoldingCount(inventory, "robbie_hex"), 1);
  assert.equal(getHoldingCount(inventory, "salt_megaphone"), 4);
});
