import Module from 'node:module';
import path from 'node:path';

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const resolved = path.join(process.cwd(), 'src', request.slice(2));
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
