const request = require('supertest');
const server = require('../server');

describe('http server', () => {
    it('respond to /', done => {
        request(server.http)
            .get('/')
            .expect(200, done);
    });
});
