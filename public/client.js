/* global Vue, io */
/* eslint-env browser */
const socket = io()
const WIDTH = 640
const SCALE = 16

Vue.component('rel-canvas', {
  template: `
    <div>
        <h3>{{ relname }}({{ relfilenode }})</h3>
        <canvas :width="width" :height="height" ref="canvas"></canvas>
    </div>
    `,
  props: [
    'relname',
    'relfilenode',
    'relpages'
  ],
  data: () => ({
    maxpages: 0
  }),
  mounted () {
    this.maxpages = this.relpages
    this.ctx = this.$refs.canvas.getContext('2d')
  },
  computed: {
    width () {
      return WIDTH
    },
    height () {
      return Math.ceil(this.maxpages / (WIDTH / SCALE)) * SCALE
    }
  },
  methods: {
    point (relfilenode, blockNo, hit) {
      if (relfilenode !== this.relfilenode) {
        return
      }
      const x = blockNo % (WIDTH / SCALE)
      const y = (blockNo / (WIDTH / SCALE)) | 0
      if (blockNo + 1 > this.maxpages) {
        this.maxpages = blockNo + 1
      }
      const ctx = this.ctx
      if (hit) {
        ctx.fillStyle = '#00c'
        ctx.fillRect(x * SCALE + 2, y * SCALE + 2, SCALE - 4, SCALE - 4)
      } else {
        ctx.fillStyle = '#f00'
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
      }
    }
  }
})

const data = {
  relations: []
}

class Scenario {
  async init () {
    this.initQueries.forEach(async function (q) {
      console.log(await sendQuery(q))
    })
    const promises = this.relations.map(r => register(r))
    await Promise.all(promises).then(relations => {
      relations.forEach(rel => {
        data.relations.push({
          relname: rel[0].relname,
          relpages: rel[0].relpages,
          relfilenode: rel[0].relfilenode
        })
      })
    })
  }

  setUp () {
    this.setUpQueries.forEach(async function (q) {
      console.log(await sendQuery(q))
    })
  }
}

class Scenario1 extends Scenario {
  constructor () {
    super()
    this.name = 'Seq Scan vs Index Scan'
    this.relations = [
      't1',
      't1_pkey'
    ]
    this.initQueries = [
      'drop table if exists t1',
      'create table t1(i1 int primary key, i2 int)',
      'set pgstudy_usleep to 0'
    ]
    this.setUpQueries = [
      'insert into t1(i1) select * from generate_series(0, 1000)'
    ]
  }
}

const app = new Vue({
  el: '#app',
  data: {
    relations: data.relations,
    histories: [],
    historyIndex: 0,
    queryText: '',
    scenarios: [
      Scenario1
    ],
    scenarioIndex: 0
  },
  computed: {
    async scenarioName () {
      const scenario = new this.scenarios[this.scenarioIndex]()
      await scenario.init()
      Vue.nextTick(() => {
        scenario.setUp()
      })
      return scenario.name
    }
  },
  methods: {
    // ctrl + enter
    onQuery () {
      sendQuery(this.queryText)
        .then(res => {
          this.histories.push(this.queryText)
          this.historyIndex = this.histories.length
          this.queryText = ''
        })
    },
    // ctrl + up
    onHistoryUp () {
      if (this.histories) {
        this.queryText = this.histories[this.historyIndex--]
        if (this.historyIndex < 0) {
          this.historyIndex = this.histories.length
        }
      }
    },
    // ctrl + down
    onHistoryDown () {
      if (this.histories) {
        this.queryText = this.histories[this.historyIndex++]
        if (this.historyIndex > this.histories.length) {
          this.historyIndex = 0
        }
      }
    },
    addRel () {
      register(this.newRel).then(res => {
        res.json().then(relations => {
          data.relations.push({
            relname: relations[0].relname,
            relpages: relations[0].relpages,
            relfilenode: relations[0].relfilenode
          })
        })
      })
    }
  }
})

function register (relname) {
  return new Promise((resolve, reject) => {
    socket.emit('/relations', relname, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(data)
    })
  })
}

setInterval(() => {
  app.$children.forEach(el => {
    const ctx = el.ctx
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  })
}, 100)

socket.on('message', msg => {
  var [rel, blockNo, hit] = msg
  app.$children.forEach(el => {
    el.point(rel, blockNo, hit)
  })
})

function sendQuery (query) {
  return new Promise((resolve, reject) => {
    socket.emit('/query', query, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}
