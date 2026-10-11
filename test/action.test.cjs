const assert = require('node:assert/strict')
const test = require('node:test')

const { run } = require('../dist/index.js')

function createCore (inputs = {}) {
  const failures = []
  const info = []
  return {
    failures,
    getInput: name => inputs[name] || '',
    info: value => info.push(value),
    setFailed: message => failures.push(message)
  }
}

function createFetch () {
  const calls = []
  return {
    calls,
    fetch: async (url, options) => {
      calls.push({ url, options })
      return { json: async () => ({ ok: true }) }
    }
  }
}

test('fails before sending a webhook when credentials are missing', async () => {
  const core = createCore()
  const { calls, fetch } = createFetch()

  await run({ core, github: { context: { payload: {} } }, fetch })

  assert.deepEqual(core.failures, ['webhook_id_token, webhook_id, or webhook_token is missing'])
  assert.equal(calls.length, 0)
})

test('sends a standard embed with separate webhook credentials', async () => {
  const core = createCore({
    webhook_id: '123',
    webhook_token: 'token',
    title: 'Build complete',
    description: 'Everything passed',
    url: 'https://example.com/build',
    color: '3447003',
    username: 'Kometa'
  })
  const { calls, fetch } = createFetch()

  await run({ core, github: { context: { payload: {} } }, fetch })

  assert.equal(calls[0].url, 'https://discord.com/api/webhooks/123/token?wait=true')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    embeds: [{
      title: 'Build complete',
      description: 'Everything passed',
      url: 'https://example.com/build',
      color: '3447003'
    }],
    username: 'Kometa'
  })
})

test('uses release details with a combined webhook credential', async () => {
  const core = createCore({
    webhook_id_token: '123/token',
    title: 'Release VERSION',
    color: '3447003',
    release: 'true'
  })
  const { calls, fetch } = createFetch()
  const github = {
    context: {
      payload: {
        release: {
          tag_name: 'v1.2.3',
          body: 'Release notes',
          html_url: 'https://example.com/releases/v1.2.3'
        }
      }
    }
  }

  await run({ core, github, fetch })

  assert.equal(calls[0].url, 'https://discord.com/api/webhooks/123/token?wait=true')
  assert.deepEqual(JSON.parse(calls[0].options.body).embeds[0], {
    title: 'Release v1.2.3',
    description: 'Release notes',
    url: 'https://example.com/releases/v1.2.3',
    color: '3447003'
  })
})

test('uses push-event commits when commit mode is enabled', async () => {
  const core = createCore({
    webhook_id_token: '123/token',
    title: 'Changes',
    color: '3447003',
    commits: 'true'
  })
  const { calls, fetch } = createFetch()
  const github = {
    context: {
      payload: {
        compare: 'https://example.com/compare',
        commits: [{
          id: '1234567890abcdef',
          url: 'https://example.com/commit/1234567',
          message: 'Fix notification'
        }]
      }
    }
  }

  await run({ core, github, fetch })

  assert.deepEqual(JSON.parse(calls[0].options.body).embeds[0], {
    title: 'Changes',
    description: '[`1234567`](https://example.com/commit/1234567) Fix notification\n',
    url: 'https://example.com/compare',
    color: '3447003'
  })
})
