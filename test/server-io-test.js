/* eslint-env node, mocha */
const server = require('../server')
const expect = require('chai').expect

describe('io server', () => {
  it('push message', done => {
    const Readable = require('stream').Readable
    let stream = new Readable()
    let io = {
      emit (name, args) {
        expect(name).to.equal('message')
        done()
      }
    }
    let ioServer = server.createIOServer(stream, io)
    stream.push('[1]\n')
    stream.push(null)
  })
})
