# linebot
Rain-forcast is a messenger chatbot tells you when to rain.

## Install Dependencies
* `$ yarn`
* `$ pip3 install -r requires.txt`

## Setup
1.  Go to [Line Developers](https://developers.line.me/console/register/messaging-api/provider/), set your channel and webhook.
2. `$ cp config.sample.json config.json` and write down your configuration. 
3. Build your model and soft-link it as `convLSTM_exteral.h5`.
4. `$ node server.js`

## Test 
Command`$node server.js testtrue)`, app will send you a notification about 5 seconds later.
