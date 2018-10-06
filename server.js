const fs = require('fs')
const https = require('https')
const express = require('express')
const config = require('./config')

const linebot = require('./linebot')

const app = express()

const options = {
  ca : fs.readFileSync('./ssl/ca_bundle.crt'),
  key: fs.readFileSync('./ssl/private.key'),
  cert: fs.readFileSync('./ssl/certificate.crt')
}

https.createServer(options, app).listen(config.port,()=>{
  console.log(`listen on port:  ${config.port}`)
})

app.use(linebot.middleware)

app.post('/webhook', async (req, res) => {
  try{
    result = await Promise.all(req.body.events.map(linebot.handleEvent))
  }catch(e){
    res.status(500).end()
  }
  res.status(200).end()
})

const pushmsg = { type: 'text', text: 'this is a push message' }
linebot.push(config.testId, pushmsg)
