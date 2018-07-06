/* eslint-env browser */
const io = require('socket.io-client/dist/socket.io')
const Vue = require('vue/dist/vue.common')
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

class Scenario1 {
  constructor () {
    this.name = 'Seq Scan vs Index Scan'
    this.relations = [
      't1',
      't1_pkey'
    ]
    this.beforeQueries = [
      'drop table if exists t1',
      'create table t1(i1 int primary key, i2 int)'
    ]
    this.afterQueries = [
      'set pgstudy_usleep to 1',
      'insert into t1(i1) select * from generate_series(0, 10000)',
      'set pgstudy_usleep to 0'
    ]
  }
}

const app = new Vue({
  el: '#app',
  data: {
    relations: data.relations,
    histories: [],
    logs: [],
    historyIndex: 0,
    queryText: '',
    newRel: '',
    scenarios: [
      Scenario1,
      Scenario1
    ],
    scenarioIndex: 0,
    scenario: null
  },
  watch: {
    scenarioIndex () {
      this.scenario = new this.scenarios[this.scenarioIndex]()
      this.init()
    }
  },
  methods: {
    async init () {
      for (let i = 0; i < this.scenario.beforeQueries.length; i++) {
        this.addLog(this.scenario.beforeQueries[i])
        console.log(await sendQuery(this.scenario.beforeQueries[i]))
      }
      await this.register()
      for (let i = 0; i < this.scenario.afterQueries.length; i++) {
        this.addLog(this.scenario.afterQueries[i])
        console.log(await sendQuery(this.scenario.afterQueries[i]))
      }
    },
    register () {
      const promises = this.scenario.relations.map(r => register(r))
      return Promise.all(promises).then(relations => {
        relations.forEach(rel => {
          this.relations.push({
            relname: rel[0].relname,
            relpages: rel[0].relpages,
            relfilenode: rel[0].relfilenode
          })
        })
      })
    },
    addLog (log) {
      this.logs.unshift(log)
    },
    refresh () {
      this.relations = []
      this.register()
    },
    // ctrl + enter
    onQuery () {
      sendQuery(this.queryText)
        .then(res => {
          console.log(res)
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
      register(this.newRel).then(rel => {
        console.log(rel)
        this.relations.push({
          relname: rel[0].relname,
          relpages: rel[0].relpages,
          relfilenode: rel[0].relfilenode
        })
        this.newRel = ''
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
      resolve(data)
    })
  })
}
