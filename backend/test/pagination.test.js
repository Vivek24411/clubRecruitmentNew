const assert = require("node:assert/strict");
const test = require("node:test");

const { pageMetadata, pageRequest } = require("../src/utils/pagination");

test("catalogue pagination has safe defaults and a hard maximum", () => {
  assert.deepEqual(pageRequest({}), { page: 1, limit: 24, skip: 0 });
  assert.deepEqual(pageRequest({ page: "3", limit: "999999" }), { page: 3, limit: 100, skip: 200 });
  assert.deepEqual(pageRequest({ page: "-4", limit: "-2" }), { page: 1, limit: 1, skip: 0 });
});

test("pagination metadata tells clients when another page exists", () => {
  assert.deepEqual(pageMetadata({ page: 2, limit: 25 }, 61), {
    page: 2, limit: 25, total: 61, pages: 3, hasMore: true,
  });
  assert.equal(pageMetadata({ page: 3, limit: 25 }, 61).hasMore, false);
});
