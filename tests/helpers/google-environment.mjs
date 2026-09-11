import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const compiled = await build({
  entryPoints: ['google/backend.js'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'HealthVoyage',
  platform: 'neutral',
});
export function environment(options = {}) {
  let clock = options.now ? Date.parse(options.now) : Date.now();
  class RuntimeDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  const properties = new Map([
      ['LINE_CHANNEL_ID', 'line-channel'],
      ['GOOGLE_CLIENT_ID', 'google-client'],
      ['ACCEPT_PATIENTS', 'true'],
    ]),
    cache = new Map(),
    books = new Map(),
    files = new Map();
  function sheet() {
    const rows = [];
    return {
      rows,
      getLastRow: () => rows.length,
      setFrozenRows() {},
      getRange(start, col, count, width) {
        return {
          getValues: () =>
            Array.from({ length: count }, (_, i) =>
              (rows[start - 1 + i] || []).slice(col - 1, col - 1 + width),
            ),
          setNumberFormat() {
            return this;
          },
          setValues(values) {
            values.forEach((v, i) => {
              rows[start - 1 + i] ??= [];
              v.forEach((cell, j) => (rows[start - 1 + i][col - 1 + j] = cell));
            });
            return this;
          },
        };
      },
    };
  }
  const spreadsheet = {
    create() {
      const id = randomUUID(),
        sheets = new Map();
      const b = {
        id,
        getId: () => id,
        getSheetByName: (n) => sheets.get(n),
        insertSheet: (n) => {
          const s = sheet();
          sheets.set(n, s);
          return s;
        },
      };
      books.set(id, b);
      return b;
    },
    openById: (id) => books.get(id),
  };
  const context = {
    Date: RuntimeDate,
    Map,
    JSON,
    Math,
    Number,
    String,
    Array,
    Error,
    encodeURIComponent,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => properties.get(k),
        setProperty(k, v) {
          properties.set(k, v);
          return this;
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cache.get(k),
        put: (k, v) => cache.set(k, v),
      }),
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }),
    },
    SpreadsheetApp: spreadsheet,
    Session: {
      getEffectiveUser: () => ({ getEmail: () => 'obm0304@gmail.com' }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        text,
        setMimeType() {
          return this;
        },
      }),
    },
    Utilities: {
      getUuid: randomUUID,
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_a, s) => [...createHash('sha256').update(s).digest()],
      base64Decode: (s) => [...Buffer.from(s, 'base64')],
      base64Encode: (b) => Buffer.from(b).toString('base64'),
      newBlob: (bytes, type, name) => ({
        bytes,
        type,
        name,
        getBytes: () => bytes,
      }),
    },
    DriveApp: {
      Access: { PRIVATE: 'private' },
      getFolderById: () => folder,
      getFileById: (id) => files.get(id),
      createFolder: () => folder,
    },
    UrlFetchApp: {
      fetch(url, options) {
        let provider = url.includes('api.line.me') ? 'line' : 'google';
        const token =
          provider === 'line'
            ? options.payload.id_token
            : new URL(url).searchParams.get('id_token');
        const subject = token.slice(80);
        const valid = !subject.startsWith('invalid');
        const claim = {
          iss:
            provider === 'line'
              ? 'https://access.line.me'
              : 'https://accounts.google.com',
          aud:
            subject === 'wrongaud'
              ? 'wrong'
              : provider === 'line'
                ? 'line-channel'
                : 'google-client',
          sub: subject,
          email:
            subject === 'admin' ? 'obm0304@gmail.com' : 'other@example.test',
          email_verified: subject !== 'unverified',
          exp: subject === 'expired' ? 1 : RuntimeDate.now() / 1000 + 3600,
        };
        return {
          getResponseCode: () => (valid ? 200 : 401),
          getContentText: () => JSON.stringify(claim),
        };
      },
    },
  };
  const folder = {
    getId: () => 'photos',
    getSharingAccess: () => 'private',
    getEditors: () => [],
    getViewers: () => [],
    createFile(blob) {
      const id = randomUUID();
      const file = {
        getId: () => id,
        getSize: () => blob.bytes.length,
        getBlob: () => blob,
      };
      files.set(id, file);
      return file;
    },
  };
  vm.createContext(context);
  vm.runInContext(compiled.outputFiles[0].text, context);
  context.HealthVoyage.setup();
  const auth = (subject = 'admin', provider = 'google') => ({
    provider,
    token: 't'.repeat(80) + subject,
  });
  const call = (action, payload = {}, identity = auth()) =>
    JSON.parse(
      context.HealthVoyage.post({
        postData: {
          contents: JSON.stringify({ action, payload, auth: identity }),
        },
      }).text,
    );
  function patient(subject, isTest = true) {
    const created = call('admin.createPatient', {
      requestId: randomUUID(),
      name: '測試個案 ' + subject,
      isTest,
    });
    assert.equal(created.ok, true);
    const identity = auth(subject, 'line');
    const bound = call(
      'bind',
      { code: created.data.code, nickname: '測試' + subject },
      identity,
    );
    assert.equal(bound.ok, true);
    return { identity, id: created.data.patient.id, code: created.data.code };
  }
  return {
    call,
    auth,
    patient,
    properties,
    books,
    files,
    cache,
    context,
    setNow: (value) => {
      clock = Date.parse(value);
    },
  };
}
