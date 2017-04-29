const request = require('supertest');
const server = require('../server');

describe('http server', () => {
    it('respond to /', done => {
        request(server.http)
            .get('/')
            .expect(200, done);
    });
});

describe('io server', () => {
    it('push message', done => {
        const Readable = require('stream').Readable;
        let stream = new Readable();
        let io = {
            emit() {
                done();
            }
        };
        let ioServer = server.createIOServer(stream, io);
        stream.push("[1]\n");
        stream.push(null);
    })
})
