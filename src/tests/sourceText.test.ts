import assert from "node:assert/strict";
import test from "node:test";
import { formatSourceText } from "../services/sourceText";
import { buildDemoResult } from "../services/research";

test("source formatting extracts document bodies and readable structured values", () => {
  assert.equal(formatSourceText(JSON.stringify({ id: "transport", notice_text: "<p>Project: <b>Power</b></p><div>Price: INR 100 &amp; taxes</div>" })), "Project: Power\n\nPrice: INR 100 & taxes");
  assert.equal(formatSourceText('{"bid_reference":"ABC","duration_months":15}'), "Bid reference: ABC\nDuration months: 15");
});

test("HTML, XML, entities and incomplete source fragments become text without active markup", () => {
  const text = formatSourceText('<root><title>Contract &amp; award</title><description>132 kV<br>Line</description><script>steal()</script><style>hide</style><!-- comment --></root>');
  assert.match(text, /Contract & award/);
  assert.match(text, /132 kV\nLine/);
  assert.doesNotMatch(text, /<|>|steal|hide|comment/);
  assert.equal(formatSourceText('&lt;p&gt;Award &amp;amp; supply&lt;/p&gt;'), 'Award & supply');
  assert.equal(formatSourceText('<root><![CDATA[<p>Readable XML body</p>]]></root>'), 'Readable XML body');
  assert.equal(formatSourceText('Price</b><br/>INR 100</div>'), 'Price\nINR 100');
  assert.equal(formatSourceText('Cost < 5 and voltage > 3.\n\nReview the source.'), 'Cost < 5 and voltage > 3.\n\nReview the source.');
});

test("real source records remain unchanged while their serialized notice becomes readable", () => {
  const library = buildDemoResult();
  const source = Object.values(library.citationsById).find((source) => source.text.includes('"notice_text"'))!;
  const before = source.text;
  const text = formatSourceText(source.text);
  assert.match(text, /Project/);
  assert.doesNotMatch(text, /<div|<br|notice_text|"bid_description"/);
  assert.equal(source.text, before);
});
