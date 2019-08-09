"use strict";

/*

MIT License

Copyright (c) 2017 Igor Kroitor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

"use strict";

//-----------------------------------------------------------------------------

const Exchange  = require ('./js/base/Exchange')
    , functions = require ('./js/base/functions')
    , errors    = require ('./js/base/errors')

//-----------------------------------------------------------------------------
// this is updated by vss.js when building

const version = '1.18.173'

Exchange.ccxtVersion = version

//-----------------------------------------------------------------------------

const exchanges = {
    '_1btcxe':                 require ('./js/_1btcxe.js'),
    'acx':                     require ('./js/acx.js'),
    'allcoin':                 require ('./js/allcoin.js'),
    'anxpro':                  require ('./js/anxpro.js'),
    'anybits':                 require ('./js/anybits.js'),
    'bcex':                    require ('./js/bcex.js'),
    'bibox':                   require ('./js/bibox.js'),
    'bigone':                  require ('./js/bigone.js'),
    'binance':                 require ('./js/binance.js'),
    'bit2c':                   require ('./js/bit2c.js'),
    'bitbank':                 require ('./js/bitbank.js'),
    'bitbay':                  require ('./js/bitbay.js'),
    'bitfinex':                require ('./js/bitfinex.js'),
    'bitfinex2':               require ('./js/bitfinex2.js'),
    'bitflyer':                require ('./js/bitflyer.js'),
    'bitforex':                require ('./js/bitforex.js'),
    'bithumb':                 require ('./js/bithumb.js'),
    'bitibu':                  require ('./js/bitibu.js'),
    'bitkk':                   require ('./js/bitkk.js'),
    'bitlish':                 require ('./js/bitlish.js'),
    'bitmarket':               require ('./js/bitmarket.js'),
    'bitmex':                  require ('./js/bitmex.js'),
    'bitsane':                 require ('./js/bitsane.js'),
    'bitso':                   require ('./js/bitso.js'),
    'bitstamp':                require ('./js/bitstamp.js'),
    'bitstamp1':               require ('./js/bitstamp1.js'),
    'bittrex':                 require ('./js/bittrex.js'),
    'bitz':                    require ('./js/bitz.js'),
    'bl3p':                    require ('./js/bl3p.js'),
    'bleutrade':               require ('./js/bleutrade.js'),
    'braziliex':               require ('./js/braziliex.js'),
    'btcalpha':                require ('./js/btcalpha.js'),
    'btcbox':                  require ('./js/btcbox.js'),
    'btcchina':                require ('./js/btcchina.js'),
    'btcexchange':             require ('./js/btcexchange.js'),
    'btcmarkets':              require ('./js/btcmarkets.js'),
    'btctradeim':              require ('./js/btctradeim.js'),
    'btctradeua':              require ('./js/btctradeua.js'),
    'btcturk':                 require ('./js/btcturk.js'),
    'buda':                    require ('./js/buda.js'),
    'bxinth':                  require ('./js/bxinth.js'),
    'ccex':                    require ('./js/ccex.js'),
    'cex':                     require ('./js/cex.js'),
    'chbtc':                   require ('./js/chbtc.js'),
    'chilebit':                require ('./js/chilebit.js'),
    'cobinhood':               require ('./js/cobinhood.js'),
    'coinbase':                require ('./js/coinbase.js'),
    'coinbaseprime':           require ('./js/coinbaseprime.js'),
    'coinbasepro':             require ('./js/coinbasepro.js'),
    'coincheck':               require ('./js/coincheck.js'),
    'coinegg':                 require ('./js/coinegg.js'),
    'coinex':                  require ('./js/coinex.js'),
    'coinexchange':            require ('./js/coinexchange.js'),
    'coinfalcon':              require ('./js/coinfalcon.js'),
    'coinfloor':               require ('./js/coinfloor.js'),
    'coingi':                  require ('./js/coingi.js'),
    'coinmarketcap':           require ('./js/coinmarketcap.js'),
    'coinmate':                require ('./js/coinmate.js'),
    'coinnest':                require ('./js/coinnest.js'),
    'coinone':                 require ('./js/coinone.js'),
    'coinspot':                require ('./js/coinspot.js'),
    'cointiger':               require ('./js/cointiger.js'),
    'coolcoin':                require ('./js/coolcoin.js'),
    'coss':                    require ('./js/coss.js'),
    'crex24':                  require ('./js/crex24.js'),
    'crypton':                 require ('./js/crypton.js'),
    'cryptopia':               require ('./js/cryptopia.js'),
    'deribit':                 require ('./js/deribit.js'),
    'dsx':                     require ('./js/dsx.js'),
    'ethfinex':                require ('./js/ethfinex.js'),
    'exmo':                    require ('./js/exmo.js'),
    'exx':                     require ('./js/exx.js'),
    'fcoin':                   require ('./js/fcoin.js'),
    'flowbtc':                 require ('./js/flowbtc.js'),
    'foxbit':                  require ('./js/foxbit.js'),
    'fybse':                   require ('./js/fybse.js'),
    'fybsg':                   require ('./js/fybsg.js'),
    'gatecoin':                require ('./js/gatecoin.js'),
    'gateio':                  require ('./js/gateio.js'),
    'gdax':                    require ('./js/gdax.js'),
    'gemini':                  require ('./js/gemini.js'),
    'getbtc':                  require ('./js/getbtc.js'),
    'hadax':                   require ('./js/hadax.js'),
    'hitbtc':                  require ('./js/hitbtc.js'),
    'hitbtc2':                 require ('./js/hitbtc2.js'),
    'huobipro':                require ('./js/huobipro.js'),
    'ice3x':                   require ('./js/ice3x.js'),
    'independentreserve':      require ('./js/independentreserve.js'),
    'indodax':                 require ('./js/indodax.js'),
    'itbit':                   require ('./js/itbit.js'),
    'jubi':                    require ('./js/jubi.js'),
    'kkex':                    require ('./js/kkex.js'),
    'kraken':                  require ('./js/kraken.js'),
    'kucoin':                  require ('./js/kucoin.js'),
    'kuna':                    require ('./js/kuna.js'),
    'lakebtc':                 require ('./js/lakebtc.js'),
    'lbank':                   require ('./js/lbank.js'),
    'liqui':                   require ('./js/liqui.js'),
    'liquid':                  require ('./js/liquid.js'),
    'livecoin':                require ('./js/livecoin.js'),
    'luno':                    require ('./js/luno.js'),
    'lykke':                   require ('./js/lykke.js'),
    'mercado':                 require ('./js/mercado.js'),
    'mixcoins':                require ('./js/mixcoins.js'),
    'negociecoins':            require ('./js/negociecoins.js'),
    'nova':                    require ('./js/nova.js'),
    'okcoincny':               require ('./js/okcoincny.js'),
    'okcoinusd':               require ('./js/okcoinusd.js'),
    // 'okex':                    require ('./js/okex.js'),
    'okex':                    require ('./js/okex3.js'),
    'paymium':                 require ('./js/paymium.js'),
    'poloniex':                require ('./js/poloniex.js'),
    'qryptos':                 require ('./js/qryptos.js'),
    'quadrigacx':              require ('./js/quadrigacx.js'),
    'quoinex':                 require ('./js/quoinex.js'),
    'rightbtc':                require ('./js/rightbtc.js'),
    'southxchange':            require ('./js/southxchange.js'),
    'surbitcoin':              require ('./js/surbitcoin.js'),
    'theocean':                require ('./js/theocean.js'),
    'therock':                 require ('./js/therock.js'),
    'tidebit':                 require ('./js/tidebit.js'),
    'tidex':                   require ('./js/tidex.js'),
    'uex':                     require ('./js/uex.js'),
    'upbit':                   require ('./js/upbit.js'),
    'urdubit':                 require ('./js/urdubit.js'),
    'vaultoro':                require ('./js/vaultoro.js'),
    'vbtc':                    require ('./js/vbtc.js'),
    'virwox':                  require ('./js/virwox.js'),
    'wex':                     require ('./js/wex.js'),
    'xbtce':                   require ('./js/xbtce.js'),
    'yobit':                   require ('./js/yobit.js'),
    'yunbi':                   require ('./js/yunbi.js'),
    'zaif':                    require ('./js/zaif.js'),
    'zb':                      require ('./js/zb.js'),    
    'wavesdex':                      require ('./js/wavesdex.js'),
    'wavesdex1':                      require ('./js/wavesdex1.js'),
    'wavesdex2':                      require ('./js/wavesdex2.js'),
    'wavesdex3':                      require ('./js/wavesdex3.js'),
    'wavesdex4':                      require ('./js/wavesdex4.js'),
    'wavesdex5':                      require ('./js/wavesdex5.js'),
    'wavesdex6':                      require ('./js/wavesdex6.js'),
    'wavesdex7':                      require ('./js/wavesdex7.js'),
    'wavesdex8':                      require ('./js/wavesdex8.js'),
    'wavesdex9':                      require ('./js/wavesdex9.js'),
    'wavesdex10':                      require ('./js/wavesdex10.js'),
    'wavesdex11':                      require ('./js/wavesdex11.js'),
    'wavesdex12':                      require ('./js/wavesdex12.js'),
    'wavesdex13':                      require ('./js/wavesdex13.js'),
    'wavesdex14':                      require ('./js/wavesdex14.js'),
    'wavesdex15':                      require ('./js/wavesdex15.js'),
    'wavesdex16':                      require ('./js/wavesdex16.js'),
    'wavesdex17':                      require ('./js/wavesdex17.js'),
    'wavesdex18':                      require ('./js/wavesdex18.js'),
    'wavesdex19':                      require ('./js/wavesdex19.js'),
    'wavesdex20':                      require ('./js/wavesdex20.js'),
    'wavesdex21':                      require ('./js/wavesdex21.js'),
    'wavesdex22':                      require ('./js/wavesdex22.js'),
    'wavesdex23':                      require ('./js/wavesdex23.js'),

    'wavesdex24':                      require ('./js/wavesdex24.js'),
    'wavesdex25':                      require ('./js/wavesdex25.js'),
    'wavesdex26':                      require ('./js/wavesdex26.js'),
    'wavesdex27':                      require ('./js/wavesdex27.js'),
    'wavesdex28':                      require ('./js/wavesdex28.js'),
    'wavesdex29':                      require ('./js/wavesdex29.js'),
    'wavesdex30':                      require ('./js/wavesdex30.js'),
    'wavesdex31':                      require ('./js/wavesdex31.js'),
    'wavesdex32':                      require ('./js/wavesdex32.js'),
    'wavesdex33':                      require ('./js/wavesdex33.js'),
    'wavesdex34':                      require ('./js/wavesdex34.js'),
    'wavesdex35':                      require ('./js/wavesdex35.js'),
    'wavesdex36':                      require ('./js/wavesdex36.js'),
    'wavesdex37':                      require ('./js/wavesdex37.js'),
    'wavesdex38':                      require ('./js/wavesdex38.js'),
    'wavesdex39':                      require ('./js/wavesdex39.js'),
    'wavesdex40':                      require ('./js/wavesdex40.js'),
    'wavesdex41':                      require ('./js/wavesdex41.js'),

    'wavesdex42':                      require ('./js/wavesdex24.js'),
    'wavesdex43':                      require ('./js/wavesdex25.js'),
    'wavesdex44':                      require ('./js/wavesdex26.js'),
    'wavesdex45':                      require ('./js/wavesdex27.js'),
    'wavesdex46':                      require ('./js/wavesdex28.js'),
    'wavesdex47':                      require ('./js/wavesdex29.js'),
    'wavesdex48':                      require ('./js/wavesdex30.js'),
    'wavesdex49':                      require ('./js/wavesdex31.js'),
    'wavesdex50':                      require ('./js/wavesdex32.js'),
    'wavesdex51':                      require ('./js/wavesdex33.js'),
    'wavesdex52':                      require ('./js/wavesdex34.js'),
    'wavesdex53':                      require ('./js/wavesdex35.js'),
    'wavesdex54':                      require ('./js/wavesdex36.js'),
    'wavesdex55':                      require ('./js/wavesdex37.js'),
    'wavesdex56':                      require ('./js/wavesdex38.js'),
    'wavesdex57':                      require ('./js/wavesdex39.js'),
    'wavesdex58':                      require ('./js/wavesdex40.js'),
    'wavesdex59':                      require ('./js/wavesdex41.js'),
    'wavesdex60':                      require ('./js/wavesdex41.js')
}

//-----------------------------------------------------------------------------

module.exports = Object.assign ({ version, Exchange, exchanges: Object.keys (exchanges) }, exchanges, functions, errors)

//-----------------------------------------------------------------------------
