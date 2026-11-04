const test = require('node:test');
const assert = require('node:assert/strict');
const { greet, createServer } = require('../src/app');

test('greet returns the expected message', () => {
  assert.equal(greet('Student'), 'Hello, Student! CI/CD deployment is working Fine.');
});

test('health endpoint responds with ok', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});
