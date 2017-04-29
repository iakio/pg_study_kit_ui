const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const pg = require('pg');
const path = require('path');
const Pool = require('pg').Pool;
const pool = new Pool({});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.get('/relations/:relname', (req, res) => {
    pool.query(`select * from pg_class where relname = $1`, [req.params.relname])
    .then(result => {
        res.send(result.rows);
    });
});

app.post('/query', (req, res) => {
    if (!req.body.query) {
        res.sendStatus(500);
        return;
    }
    pool.query(req.body.query).then(result => {
        res.send("OK");
    })
    .catch(err => {
        console.error(err);
        res.sendStatus(500);
    });
});


function createIOServer(inputStream, io) {
    let fragment = '';
    inputStream.on('data',  data => {
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
}

if (!module.parent) {
    createIOServer(process.stdin, io);

    httpServer.listen(3000, function () {
        console.log('listening on *:3000');
    });
}

module.exports = {
    http: httpServer,
    createIOServer: createIOServer
};
