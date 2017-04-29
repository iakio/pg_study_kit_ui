const socket = io();
const WIDTH = 640;
const SCALE = 16;

Vue.component('rel-canvas', {
    template: `
    <div>
        <h3>{{ relname }}({{ relfilenode }})</h3>
        <canvas :width="width" :height="height" ref="canvas"></canvas>
    </div>
    `,
    props: [
        "width",
        "height",
        "relname",
        "relfilenode",
        "relpages"
    ],
    data: () => ({
        maxpages: 0
    }),
    mounted: function () {
        this.maxpages = this.relpages;
        this.ctx = this.$refs.canvas.getContext("2d");
    },
    computed: {
        height() {
            return Math.ceil(this.maxpages / (WIDTH / SCALE)) * SCALE;
        }
    },
    methods: {
        point: function (relfilenode, blockNo, hit) {
            if (relfilenode !== this.relfilenode) {
                return;
            }
            const x = blockNo % (WIDTH / SCALE);
            const y = (blockNo / (WIDTH / SCALE)) | 0;
            if (blockNo + 1 > this.maxpages) {
                this.maxpages = blockNo + 1;
            }
            const ctx = this.ctx;
            if (hit) {
                ctx.fillStyle = "#00c";
                ctx.fillRect(x * SCALE + 2, y * SCALE + 2, SCALE - 4, SCALE - 4);
            }
            else {
                ctx.fillStyle = "#f00";
                ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
            }
        },
    }
});

const data = {
    relations: []
};

const app = new Vue({
    el: "#app",
    data,
    methods: {
        onkeyup: function (ev) {
            sendQuery(ev.target.value);
        }
    }
});

function register(relname) {
    return fetch('/relations/' + relname);
}

document.addEventListener('DOMContentLoaded', () => {
    let promises = [
        register('pgbench_accounts'),
        register('pgbench_accounts_pkey'),
        // register('t1'),
        // register('t1_pkey'),
        // register('t2'),
        // register('t2_pkey'),
    ];
    Promise.all(promises).then(values => {
        values.forEach(res => {
            res.json().then(relations => {
                data.relations.push({
                    width: WIDTH,
                    height: 100,
                    relname: relations[0].relname,
                    relpages: relations[0].relpages,
                    relfilenode: relations[0].relfilenode
                });
            });
        });
    });
});


setInterval(() => {
    app.$children.forEach(el => {
        const ctx = el.ctx;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
}, 100);


socket.on("message", msg => {
    var [rel, blockNo, hit] = msg;
    app.$children.forEach(el => {
        el.point(rel, blockNo, hit);
    });
});


function sendQuery(query) {
    return fetch("/query", {
        method: "post",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            query: query
        })
    })
}
