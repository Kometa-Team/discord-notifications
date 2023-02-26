const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')

async function run () {
    const webhookId = core.getInput('webhook_id')
    const webhookToken = core.getInput('webhook_token')
    const webhookIdToken = core.getInput('webhook_id_token')

    if ((!webhookId || !webhookToken) && !webhookIdToken)
      return core.setFailed('webhook_id_token, webhook_id, or webhook_token is missing')
    if (webhookId.indexOf('E') > -1)
      return core.setFailed('webhook_id must be a string')

    const embedMsg = { }
    const title = core.getInput('title')
    embedMsg['color'] = core.getInput('color')
    const description = core.getInput('description')
    const url = core.getInput('url')
    const isRelease = core.getInput('release')
    const isCommits = core.getInput('commits')
    if (isRelease == 'true') {
        const release = github.context.payload.release
        embedMsg['title'] = title.replace('VERSION', release.tag_name)
        embedMsg['description'] = description.length < 1500 ? release.body : release.body.substring(0, 1500) + ` ([...](${release.html_url}))`
        embedMsg['url'] = url ? url : release.html_url
    }
    else if (isCommits == 'true') {
        const commits = github.context.payload.commits
        embedMsg['title'] = title
        embedMsg['url'] = url ? url : github.context.payload.compare
        let text = ''
        for (let i = 0; i < commits.length; i++)
            text += '[`' + commits[i].id.substring(0, 7) + '`](' + commits[i].url + ') ' + commits[i].message + '\n';
        embedMsg['description'] = text
    }
    else {
        embedMsg['title'] = title
        if (description)
            embedMsg['description'] = description
        if (url)
            embedMsg['url'] = url
    }

    const author = core.getInput('author')
    const author_url = core.getInput('author_url')
    const author_icon_url = core.getInput('author_icon_url')

    if (author || author_url || author_icon_url)
        embedMsg['author'] = { }
    if (author)
        embedMsg['author']['name'] = author
    if (author_url)
        embedMsg['author']['url'] = author_url
    if (author_icon_url)
        embedMsg['author']['icon_url'] = author_icon_url

    const body = { embeds: [embedMsg] }

    const username = core.getInput('username')
    if (username)
        body['username'] = username
    const avatar_url = core.getInput('avatar_url')
    if (avatar_url)
        body['avatar_url'] = avatar_url
    const message = core.getInput('message')
    if (message)
        body['content'] = message

    console.log(JSON.stringify(body))
    const webhook = 'https://discord.com/api/webhooks/' + (webhookIdToken ? webhookIdToken : (webhookId + '/' + webhookToken)) + '?wait=true'
    fetch(webhook, {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => core.info(JSON.stringify(data)))
      .catch(err => core.info(err))
}

run()
