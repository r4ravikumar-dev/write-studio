import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createZipArchive} from '../src/lib/zip';

test('createZipArchive produces a valid ZIP structure readable by unzip tools', async () => {
  const zipBlob = createZipArchive([
    {name: 'README.md', data: '# Hello World\nThis is a test.'},
    {name: 'metadata/info.json', data: JSON.stringify({ok: true})},
    {name: 'media/test.bin', data: new Uint8Array([1, 2, 3, 4, 5])},
  ]);

  const arrayBuffer = await zipBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check magic signature at byte 0 (PK\x03\x04)
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
  assert.equal(buffer[2], 0x03);
  assert.equal(buffer[3], 0x04);

  // Check that the names exist in the binary buffer
  assert.ok(buffer.includes(Buffer.from('README.md')));
  assert.ok(buffer.includes(Buffer.from('metadata/info.json')));
  assert.ok(buffer.includes(Buffer.from('media/test.bin')));

  // Check EOCD signature at end (PK\x05\x06)
  assert.equal(buffer[buffer.length - 22], 0x50);
  assert.equal(buffer[buffer.length - 21], 0x4b);
  assert.equal(buffer[buffer.length - 20], 0x05);
  assert.equal(buffer[buffer.length - 19], 0x06);
});
