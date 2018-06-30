/* global Vue, io */
/* eslint-env browser */
const socket = io()
const WIDTH = 640
const SCALE = 8

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

class SeqScanVsIndexScan {
  constructor (ctx) {
    this.ctx = ctx
    this.name = 'Seq Scan vs Index Scan'
  }

  init () {
    const promises = [
      register('pgbench_accounts'),
      register('pgbench_accounts_pkey')
    ]
    Promise.all(promises).then(values => {
      values.forEach(res => {
        res.json().then(relations => {
          data.relations.push({
            relname: relations[0].relname,
            relpages: relations[0].relpages,
            relfilenode: relations[0].relfilenode
          })
        })
      })
    })
  }
  setUp () {
    sendQuery('select * from pgbench_accounts')
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
      SeqScanVsIndexScan
    ],
    scenarioIndex: 0
  },
  computed: {
    scenarioName () {
      const scenario = new this.scenarios[this.scenarioIndex]()
      scenario.init()
      scenario.setUp()
      return scenario.name
    }
  },
  methods: {
    // ctrl + enter
    onQuery () {
      sendQuery(this.queryText)
        .then(res => {
          if (res.ok) {
            this.histories.push(this.queryText)
            this.historyIndex = this.histories.length
            this.queryText = ''
          }
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
  return fetch('/relations/' + relname)
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
  return fetch('/query', {
    method: 'post',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      query: query
    })
  })
}
