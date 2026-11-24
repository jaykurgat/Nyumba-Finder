# Import regression fixtures

`propertypro-3bssv.snapshot.html` is a compact HTML snapshot of the selected public listing's observed result card, not a complete capture of its detail page. The record was checked against PropertyPro's indexed public results on 2026-11-24. It is intentionally limited to the facts used by the regression test. The expected values are manually transcribed in the adjacent JSON file.

The detail URL is retained as the listing identity under test. The detail page itself was not available to the read-only page viewer during this audit, so this fixture does not claim to be a full page capture or to verify unobserved amenities, bathrooms, or imagery.

Additional fixtures should include their source URL, capture date, capture method, a compact snapshot, and manually reviewed expected fields. Keep third-party content limited to what is needed to reproduce importer behavior.

`conflicting-details.synthetic.html` is a deliberately constructed edge case, not a source-site capture. The title says three bedrooms while the body says four; expected behavior is to preserve both pieces of evidence, flag a contradiction, and keep the import in private review.

