import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { csvEscape } from '../src/app/api/export/route';
import { detectFileType } from '../src/lib/security/fileSignature';

describe('file signature detection', () => {
  it('detects allowed image and pdf signatures', () => {
    assert.deepEqual(
      detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
      { mimeType: 'image/jpeg', extension: 'jpg' },
    );
    assert.deepEqual(
      detectFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
      { mimeType: 'application/pdf', extension: 'pdf' },
    );
  });

  it('rejects unknown content', () => {
    assert.equal(detectFileType(new TextEncoder().encode('not an image')), null);
  });
});

describe('csv escaping', () => {
  it('neutralizes spreadsheet formula prefixes', () => {
    assert.equal(csvEscape('=SUM(1,1)'), "\"'=SUM(1,1)\"");
    assert.equal(csvEscape('+cmd'), "'+cmd");
    assert.equal(csvEscape('@user'), "'@user");
  });
});
