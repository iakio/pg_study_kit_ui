const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const httpServer = require('http').createServer(app)
const io = require('socket.io')(httpServer)
const path = require('path')
const Client = require('pg').Client
const client = new Client()
client.connect()

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.get('/relations/:relname', (req, res) => {
  client.query(`select * from pg_class where relname = $1`, [req.params.relname])
    .then(result => {
      res.send(result.rows)
    })
    .catch(err => res.status(500).send({error: err.message}))
})

app.post('/query', (req, res) => {
  if (!req.body.query) {
    res.sendStatus(500)
    return
  }
  client.query(req.body.query).then(result => {
    res.send(result)
  }).catch(err => res.status(500).send({error: err.message}))
})

function createIOServer (inputStream, io) {
  let fragment = ''
  inputStream.on('data', data => {
    if (data !== null) {
      let lines = data.toString('utf-8').split(/\n/)
      lines[0] = fragment + lines[0]
      fragment = lines.pop()
      lines.forEach(function (line) {
        if (line) {
          try {
            io.emit('message', JSON.parse(line))
          } catch (ex) {
            console.error(ex)
          }
        }
      })
    }
  })
}

if (!module.parent) {
  createIOServer(process.stdin, io)

  httpServer.listen(3000, function () {
    console.log('listening on *:3000')
  })
}

module.exports = {
  http: httpServer,
  createIOServer: createIOServer
}
