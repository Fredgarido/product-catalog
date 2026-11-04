const { env } = require('process')
const net = require('net')

const target = env.ASPNETCORE_HTTPS_PORT
  ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
  : env.ASPNETCORE_URLS
    ? env.ASPNETCORE_URLS.split(';')[0]
    : 'https://localhost:7054'

console.log('[proxy] Forwarding /api to', target)

const apiStartupTimeoutMs = 60_000
const retryDelayMs = 250
let apiReady

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
  })
}

async function waitForApi() {
  const url = new URL(target)
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))
  const deadline = Date.now() + apiStartupTimeoutMs

  while (Date.now() < deadline) {
    if (await canConnect(url.hostname, port)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
  }
}

module.exports = [
  {
    context: ['/api'],
    target,
    secure: false,
    configure: (proxy) => {
      const forward = proxy.web.bind(proxy)
      proxy.web = (req, res, ...rest) => {
        apiReady ??= waitForApi()
        apiReady.then(() => forward(req, res, ...rest))
      }
    },
  },
]
