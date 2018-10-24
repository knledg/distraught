// @flow
type Ava = any;

const ava: Ava = require("ava");

const formatCap = require("../../src/lib/transformations").formatCap;

// ava test/tests/format-cap.js

ava("formatCap handles edge cases", (t) => {
  t.is(formatCap(""), "");
  // $FlowIgnore
  t.is(formatCap(null), null);
  // $FlowIgnore
  t.is(formatCap(true), true);
  // $FlowIgnore
  t.is(formatCap(false), false);
  // $FlowIgnore
  t.is(formatCap(1), 1);
  // $FlowIgnore
  t.is(formatCap(1.5), 1.5);
  // $FlowIgnore
  t.is(formatCap(), undefined);
});

ava("formatCap normalizes capitalization", (t) => {
  t.is(formatCap("ALL CAPS ALPHANUMERIC"), "All Caps Alphanumeric");
  t.is(formatCap("ST MARTIN"), "St Martin");
  t.is(formatCap("ST Martin"), "St Martin");
  t.is(formatCap("st martin"), "St Martin");
  t.is(formatCap("st. martin"), "St. Martin");
  t.is(formatCap("w. belmont st."), "W. Belmont St.");
  t.is(formatCap("w belmont st"), "W Belmont St");
  t.is(formatCap("w belmont ave"), "W Belmont Ave");
  t.is(formatCap("w belmont ave."), "W Belmont Ave.");
  t.is(formatCap("w belmont blvd."), "W Belmont Blvd.");
  t.is(formatCap("w belmont blvd., fl"), "W Belmont Blvd., FL");
  t.is(formatCap("az"), "AZ");
  t.is(formatCap("nm"), "NM");
});
