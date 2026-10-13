import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { csvEscape } from '../src/app/api/export/route';
import { detectFileType } from '../src/lib/security/fileSignature';

describe('file signature detection', () => {
  it('detects allowed image signatures', () => {
    assert.deepEqual(
      detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
      { mimeType: 'image/jpeg', extension: 'jpg' },
    );
    assert.deepEqual(
      detectFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      { mimeType: 'image/png', extension: 'png' },
    );
    assert.deepEqual(
      detectFileType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
      { mimeType: 'image/webp', extension: 'webp' },
    );
    assert.deepEqual(
      detectFileType(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])),
      { mimeType: 'image/heic', extension: 'heic' },
    );
  });

  it('detects pdf signatures used by exports', () => {
    assert.deepEqual(
      detectFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
      { mimeType: 'application/pdf', extension: 'pdf' },
    );
  });

  it('rejects unknown and spoofed content', () => {
    assert.equal(detectFileType(new TextEncoder().encode('not an image')), null);
    assert.equal(detectFileType(new TextEncoder().encode('fake png payload')), null);
  });
});

describe('csv escaping', () => {
  it('neutralizes spreadsheet formula prefixes', () => {
    assert.equal(csvEscape('=SUM(1,1)'), "\"'=SUM(1,1)\"");
    assert.equal(csvEscape('+cmd'), "'+cmd");
    assert.equal(csvEscape('@user'), "'@user");
  });
});
