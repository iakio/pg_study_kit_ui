const request = require('supertest');
const server = require('../server');

describe('http server', () => {
    it('respond to /', done => {
        request(server.http)
            .get('/')
            .expect(200, done);
    });
    describe('respond to /query', () => {
        it('success if query is passed', done => {
            request(server.http)
                .post('/query')
                .send({query: 'select 1'})
                .expect(200, done);
        });
        it('fails if no query is passed', done => {
            request(server.http)
                .post('/query')
                .expect(500, done);
        });
        it('fails if invalid query is given', done => {
            request(server.http)
                .post('/query')
                .send({query: 'invalid query'})
                .expect(500, done);
        });
    })
});
