const fs = require('fs')
const https = require('https')
const express = require('express')
const config = require('./config')
const line = require('@line/bot-sdk')

const channel = {
  channelSecret: config.channelSecret, 
  channelAccessToken: config.channelAccessToken
}

const app = express()

const options = {
  ca : fs.readFileSync('./ssl/ca_bundle.crt'),
  key: fs.readFileSync('./ssl/private.key'),
  cert: fs.readFileSync('./ssl/certificate.crt')
}

https.createServer(options, app).listen(config.port,()=>{
  console.log(`listen on port:  ${config.port}`)
})


const client = new line.Client(channel)


app.post('/webhook', line.middleware(config), async (req, res) => {
  try{
    result = await Promise.all(req.body.events.map(handleEvent))
  }catch(e){
    res.status(500).end()
  }
  res.status(200).end()
})

async function handleEvent(event) {
  if(event.type =='follow'){
      return Promise.resolve()
  }else if (event.type === 'message' && event.message.type === 'text') {
    const echo = { type: 'text', text: event.message.text }
    return Promise.resolve(
      client.replyMessage(event.replyToken, echo)
    )
  }
  
}

const push = { type: 'text', text: 'hi hi' }
client.pushMessage(config.testId, push)
/*
const flexContent = {} to customize flex message ,use line official tool: https://developers.line.me/console/fx/
const flex = {
    "type": "flex",
    "altText": "this is a flex message",
    "contents": flexContent
}
client.pushMessage(config.testId, flex)
*/
