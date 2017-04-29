const request = require('supertest');
const server = require('../server');

describe('server running', () => {
    it('respond to /', (done) => {
        request(server)
            .get('/')
            .expect(200, done);
    });
});
