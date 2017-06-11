const request = require('supertest');
const server = require('../server');
const expect = require('chai').expect;

describe('http server', () => {
    describe('check the Pg sleep time', () => {
        it('should be zero', done => {
            request(server.http)
                .post('/query')
                .send({query: 'show pgstudy_usleep'})
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    }
                    expect(res.body.rows[0].pgstudy_usleep).to.equal("0");
                    done();
                });
        })
    });
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
    });

    describe('respond to /relations:relname', () => {
        it('returns information of the relation', () => {
            return request(server.http)
                .get('/relations/pg_user')
                .expect(200)
                .then(res => {
                    expect(res.body[0].relname).to.equal("pg_user");
                });
        });
    });
});
