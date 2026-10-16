import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { it } from "bun:test";

it("census imports require review and reject annotations without touching the source file", () => {
  const result = spawnSync("python3", ["-"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    input: `
import importlib.util, json, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('catalog_builder', 'scripts/build-research-catalogs.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
with tempfile.TemporaryDirectory() as folder:
    builder.REVIEWED_CENSUS = Path(folder) / 'manifest.json'
    row = dict(id='existing-stable-id', collection='ai-for-science', name='Current lab',
               entityType='lab', lead='Verified PI', institution='University', country='Country',
               city='', url='https://example.org/lab', primary='scientific-ml', topics=['scientific-ml'],
               summary='Verified programme', question='', questionBasis='',
               evidenceUrls=['https://example.org/research'], status='CORE', activity='2026 output')
    valid = dict(status='REVIEWED_LOWER_BOUND', auditedAt='2026-10-13',
                 provenance={'ledger_sha256':'reviewed-source-hash'}, catalogs={'ai-for-science':[row]})
    builder.REVIEWED_CENSUS.write_text(json.dumps(valid))
    assert builder.reviewed_catalogs()['ai-for-science'][0]['id'] == 'existing-stable-id'
    for changes in ({'status':'DRAFT_NOT_FOR_DEPLOYMENT'},
                    {'catalogs':{'ai-for-science':[{**row, 'privateNotes':'private'}]}},
                    {'catalogs':{'ai-for-science':[{**row, 'collection':'neuroai'}]}}):
        builder.REVIEWED_CENSUS.write_text(json.dumps({**valid, **changes}))
        original = builder.REVIEWED_CENSUS.read_bytes()
        try:
            builder.reviewed_catalogs()
        except ValueError:
            pass
        else:
            raise AssertionError('Unsafe census import accepted')
        assert builder.REVIEWED_CENSUS.read_bytes() == original
print('review and privacy boundaries passed')
`,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /review and privacy boundaries passed/u);
});
