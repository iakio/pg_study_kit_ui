const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const pg = require('pg');
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.get('/relations/:relname', (req, res) => {
    const client = new pg.Client({
        // database: 'pagila'
    });
    client.connect();
    client.on('drain', client.end.bind(client));
    client.query(`select * from pg_class where relname = $1`, [req.params.relname], (err, result) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }
        res.send(result.rows);
    });
});

app.post('/query', (req, res) => {
    const client = new pg.Client({
        // database: 'pagila'
    });
    if (req.body.query) {
        client.connect();
        client.query(req.body.query, function (err, result) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            res.send("OK");
        });
    }
});

let fragment = '';
process.stdin.on('data', function (data) {
    if (data !== null) {
        let lines = data.toString('utf-8').split(/\n/);
        lines[0] = fragment + lines[0];
        fragment = lines.pop();
        lines.forEach(function (line) {
            if (line) {
                try {
                    io.emit('message', JSON.parse(line));
                }
                catch (ex) {
                    console.error(ex);
                }
            }
        });
    }
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
