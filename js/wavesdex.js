'use strict';

/* eslint-disable */

const Exchange = require ('./base/Exchange');
const axios = require ('axios');
const wc = require('waves-crypto');
const { BASE58_STRING, LONG } = wc
const { order } = require('waves-transactions');
const { ExchangeError, ArgumentsRequired, ExchangeNotAvailable, OrderNotFound, InvalidOrder, AuthenticationError, InvalidNonce } = require ('./base/errors');

module.exports = class wavesdex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'initDex': false,
            'id': 'wavesdex',
            'name': 'wavesdex',
            'countries': [ 'JP' ],
            'rateLimit': 500,
            'version': '3',
            'userAgent': this.userAgents['chrome'],
            'has': {
                'fetchDepositAddress': true,
                'CORS': false,
                'fetchBidsAsks': true,
                'fetchTickers': true,
                'fetchOHLCV': true,
                'fetchMyTrades': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'withdraw': true,
                'fetchFundingFees': true,
                'fetchDeposits': true,
                'fetchWithdrawals': true,
                'fetchTransactions': false,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27982022-75aea828-63a0-11e7-9511-ca584a8edd74.jpg',
                'api': {
                    'public': 'https://api.wavesdex.io/api',
                    'private': 'https://api.wavesdex.io/tapi',
                },
                'www': 'https://wavesdex.io',
                'doc': 'https://wavesdex.io/api',
                'fees': 'https://wavesdex.io/fee',
            },
            'api': {
                'public': {
                    'get': [
                        'info',
                        'ticker/{pair}',
                        'depth/{pair}',
                        'trades/{pair}',
                    ],
                },
                'private': {
                    'post': [
                        'getInfo',
                        'Trade',
                        'ActiveOrders',
                        'OrderInfo',
                        'CancelOrder',
                        'TradeHistory',
                        'CoinDepositAddress',
                        'WithdrawCoin',
                        'CreateCoupon',
                        'RedeemCoupon',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'maker': 0.001,
                    'taker': 0.001,
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {},
                    'deposit': {},
                },
            },
            'commonCurrencies': {
                'DSH': 'DASH',
            },
            'exceptions': {
                '-1000': ExchangeNotAvailable,
                // {"code":-1000,"msg":"An unknown error occured while processing the request."}
                '-1013': InvalidOrder,  // createOrder -> 'invalid quantity'/'invalid price'/MIN_NOTIONAL
                '-1021': InvalidNonce,  // 'your time is ahead of server'
                '-1022': AuthenticationError,  // {"code":-1022,"msg":"Signature for self request is not valid."}
                '-1100': InvalidOrder,  // createOrder(symbol, 1, asdf) -> 'Illegal characters found in parameter 'price'
                '-1104': ExchangeError,  // Not all sent parameters were read, read 8 parameters but was sent 9
                '-1128': ExchangeError,  // {"code":-1128,"msg":"Combination of optional parameters invalid."}
                '-2010': ExchangeError,
                // generic error code for createOrder -> 'Account has insufficient balance for requested action.', {"code":-2010,"msg":"Rest API trading is not enabled."}, etc...
                '-2011': OrderNotFound,  // cancelOrder(1, 'BTC/USDT') -> 'UNKNOWN_ORDER'
                '-2013': OrderNotFound,  // fetchOrder(1, 'BTC/USDT') -> 'Order does not exist'
                '-2014': AuthenticationError,  // {"code":-2014, "msg": "API-key format invalid."}
                '-2015': AuthenticationError,  // "Invalid API-key, IP, or permissions for action."
            },
            'options': {
                'fetchTickersMethod': 'publicGetTicker24hr',
                'defaultTimeInForce': 'GTC',  // 'GTC' = Good To Cancel(default), 'IOC' = Immediate Or Cancel
                'defaultLimitOrderType': 'limit',  // or 'limit_maker'
                'hasAlreadyAuthenticatedSuccessfully': false,
                'warnOnFetchOpenOrdersWithoutSymbol': true,
                'recvWindow': 5 * 1000,  // 5 sec, wavesdex default
                'timeDifference': 0,  // the difference between system clock and wavesdex clock
                'adjustForTimeDifference': false,  // controls the adjustment logic upon instantiation
                'parseOrderToPrecision': false,  // force amounts and costs in parseOrder to precision
                'newOrderRespType': {
                    'market': 'FULL',  // 'ACK' for order id, 'RESULT' for full order or 'FULL' for order with fills
                    'limit': 'RESULT',  // we change it from 'ACK' by default to 'RESULT'
                },
            },
        });
    }

    nonce (params = {}) {
        return this.milliseconds() - this.options['timeDifference']
    }

    loadTimeDifference (params = {}) {
        this.options['timeDifference'] = 0
        return this.options['timeDifference']
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': cost,
        };
    }

    async fetchMarkets (params = {}) {
        let response = await this.publicGetInfo ();
        let markets = response['symbols'];
        let keys = Object.keys (markets);
        let result = [];
        for (let i = 0; i < keys.length; i++) {
            let id = keys[i];
            let market = markets[id];
            let [ baseId, quoteId ] = id.split ('_');
            let base = baseId.toUpperCase ();
            let quote = quoteId.toUpperCase ();
            base = this.commonCurrencyCode (base);
            quote = this.commonCurrencyCode (quote);
            let symbol = base + '/' + quote;
            let precision = {
                'amount': this.safeInteger (market, 'decimal_places'),
                'price': this.safeInteger (market, 'decimal_places'),
            };
            let amountLimits = {
                'min': this.safeFloat (market, 'min_amount'),
                'max': this.safeFloat (market, 'max_amount'),
            };
            let priceLimits = {
                'min': this.safeFloat (market, 'min_price'),
                'max': this.safeFloat (market, 'max_price'),
            };
            let costLimits = {
                'min': this.safeFloat (market, 'min_total'),
            };
            let limits = {
                'amount': amountLimits,
                'price': priceLimits,
                'cost': costLimits,
            };
            let hidden = this.safeInteger (market, 'hidden');
            let active = (hidden === 0);
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'taker': market['fee'] / 100,
                'precision': precision,
                'limits': limits,
                'info': market,
            });
        }
        return result;
    }

     InitMatcher (params = {}) {
        let self = this

        if (!self.initDex) {
            self.dexid = {
                "WAVES": "",
                "BTC": "8LQW8f7P5d5PZM7GtZEBgaqRPGSzS3DfPuiXrURJ4AJS",
                "ETH": "474jTeYx2r2Va35794tCScAXWJG9hU2HcgxzMowaZUnu",
                "USD": "Ft8X1v1LTa1ABafufpaCWyVj8KkaxUWE6xBhW6sNFJck",
            }
            self.decimals = {
                "WAVES": 8,
                "BTC": 8,
                "ETH": 8,
                "USD": 2,
            }
            self.initDex = true
            self.matcherUrl = 'https://matcher.wavesnodes.com'
            self.nodeUrl = 'https://nodes.wavesplatform.com'

            self.userAddress = wc.address(self.apiKey) // this.apiKey <-- SEED Phrase
            self.publicKey = wc.publicKey(self.apiKey)
            self.privateKey = wc.privateKey(self.apiKey)
        }
    }

    initBalance (params = {}) {
        let balances = {};
        balances['WAVES'] = {
            free: 0,
            used: 0,
            total: 0
        }
        for (let market in this.dexid) {
            balances[market] = {
                free: 0,
                used: 0,
                total: 0
            }
        }
        return balances
    }

    parseBalance (balances) {
        for (let market in balances) {
            balances[market]['info'] = {
                free: balances[market]['free'],
                used: balances[market]['used'],
                total: balances[market]['total']
            }
        }
        return balances
    }

    async fetchBalance (config, params = {}) {
        this.InitMatcher();
        let balances = this.initBalance();

        // FOR TEST
        if (config === 'TEST') {
            //
            for (let market in this.dexid) {
                if (market === 'WAVES') {
                    let bal = await axios({
                        method:'get',
                        url: this.nodeUrl + '/addresses/balance/3PPKDQ3G67gekeobR8MENopXytEf6M8WXhs'
                    })
                    bal = bal['data']
                    balances['WAVES']['total'] = bal['balance'] / 10 ** this.decimals['WAVES']
                } else {
                    let marketid = this.dexid[market]

                    let assetPrecision = this.decimals['WAVES']
                    let marketPrecision = this.decimals[market]

                    // Tradable Balance
                    let tradeB = await axios({
                        method:'get',
                        url: this.matcherUrl + '/matcher/orderbook/WAVES/' + marketid + '/tradableBalance/3PPKDQ3G67gekeobR8MENopXytEf6M8WXhs'
                    })
                    tradeB = tradeB['data']

                    balances[market]['free'] = tradeB[marketid] / 10 ** marketPrecision
                    balances['WAVES']['free'] = tradeB['WAVES'] / 10 ** assetPrecision

                    // Total Balance
                    let totalB = await axios({
                        method:'get',
                        url: this.nodeUrl + '/assets/balance/3PPKDQ3G67gekeobR8MENopXytEf6M8WXhs/' + marketid
                    })
                    totalB = totalB['data']

                    balances[market]['total'] = totalB['balance'] / 10 ** marketPrecision

                    // Used Balance
                    balances[market]['used'] = balances[market]['total'] - balances[market]['free']
                    balances['WAVES']['used'] = balances['WAVES']['total'] - balances['WAVES']['free']
                }
            }
            //
        } else {
            for (let market in this.dexid) {
                if (market === 'WAVES') {
                    let bal = await axios({
                        method:'get',
                        url: this.nodeUrl + '/addresses/balance/' + this.userAddress
                    })
                    bal = bal['data']
                    balances['WAVES']['total'] = bal['balance']
                } else {
                    let marketid = this.dexid[market]

                    let assetPrecision = this.decimals['WAVES']
                    let marketPrecision = this.decimals[market]

                    // Tradable Balance
                    let tradeB = await axios({
                        method:'get',
                        url: this.matcherUrl + '/matcher/orderbook/WAVES/' + marketid + '/tradableBalance/' + this.userAddress
                    })
                    tradeB = tradeB['data']

                    balances[market]['free'] = tradeB[marketid] / 10 ** marketPrecision
                    balances['WAVES']['free'] = tradeB['WAVES'] / 10 ** assetPrecision

                    // Total Balance
                    let totalB = await axios({
                        method:'get',
                        url: this.nodeUrl + '/assets/balance/' + this.userAddress + '/' + marketid
                    })
                    totalB = totalB['data']

                    balances[market]['total'] = totalB['balance'] / 10 ** marketPrecision

                    // Used Balance
                    balances[market]['used'] = balances[market]['total'] - balances[market]['free']
                    balances['WAVES']['used'] = balances['WAVES']['total'] - balances['WAVES']['free']
                }
            }
        }

        balances = this.parseBalance(balances)
        return balances
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        this.InitMatcher();
        let assetname = symbol.split('/')[0]
        let marketname = symbol.split('/')[1]

        let assetid = this.dexid[assetname]
        let marketid = this.dexid[marketname]

        let assetPrecision = this.decimals[assetname]
        let marketPrecision = this.decimals[marketname]

        // let dexBook = await axios.get(this.matcherUrl + '/matcher/orderbook/' + assetname + '/' + marketid)
        let dexBook = await axios({
            method:'get',
            url: this.matcherUrl + '/matcher/orderbook/' + assetname + '/' + marketid
        })
        dexBook = dexBook['data']
        let bids = []
        for (let i in dexBook['bids']) {
            let price = parseFloat(dexBook['bids'][i]['price']) / 10 ** (8 + marketPrecision - assetPrecision)
            let size = parseFloat(dexBook['bids'][i]['amount']) / 10 ** assetPrecision
            bids.push([price, size])
        }
        let asks = []
        for (let i in dexBook['asks']) {
            let price = parseFloat(dexBook['asks'][i]['price']) / 10 ** (8 + marketPrecision - assetPrecision)
            let size = parseFloat(dexBook['asks'][i]['amount']) / 10 ** assetPrecision
            asks.push([price, size])
        }
        let orderbook = {
            'bids': bids,
            'asks': asks,
            'timestamp': Date.now(),
        }
        return orderbook
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        this.InitMatcher();
        let assetname = symbol.split('/')[0]
        let marketname = symbol.split('/')[1]

        let assetid = this.dexid[assetname]
        let marketid = this.dexid[marketname]

        let assetPrecision = this.decimals[assetname]
        let marketPrecision = this.decimals[marketname]

        let floatPrice = Math.floor(price * 10 ** 8) / 10 ** 8
        let intPrice = parseInt(floatPrice * 10 ** (8 + marketPrecision - assetPrecision))
        let intQty = parseInt(amount * 10 ** assetPrecision)

        // Sign Order
        const orderParams = {
            amount: intQty,
            price: intPrice,
            priceAsset: marketid,
            matcherPublicKey: '7kPFrHDiGw1rCm7LPszuECwWYL3dMf6iMifLRDJQZMzy',
            orderType: side
        }
        const signedOrder = order(orderParams, this.apiKey)

        // Broadcast order
        let ord = await axios.post(this.matcherUrl + '/matcher/orderbook', signedOrder)
        ord = ord['data']

        let res = {}
        if (ord['status'] === 'OrderAccepted') {
            res = ord['message']
            res['side'] = res['orderType']
            res['price'] = res['price'] / 10 ** (8 + marketPrecision - assetPrecision)
            res['amount'] = res['amount'] / 10 ** (8 + marketPrecision - assetPrecision)
            res['symbol'] = symbol
            res['status'] = 'OK'
        } else {
            res['status'] = 'ERR'
            res['message'] = ord
        }

        return res
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        let self = this

        this.InitMatcher();
        let assetname = symbol.split('/')[0]
        let marketname = symbol.split('/')[1]

        let assetid = self.dexid[assetname]
        let marketid = self.dexid[marketname]

        let assetPrecision = self.decimals[assetname]
        let marketPrecision = self.decimals[marketname]

        const paramsToDeleteBytes = wc.concat(
            BASE58_STRING(self.publicKey),
            BASE58_STRING(id),
        )
        const signedBytes = wc.signBytes(paramsToDeleteBytes, self.apiKey)

        const paramsToDelete = {
            sender: self.publicKey,
            orderId: id,
            signature: signedBytes
        }

        //Cancel
        let ord = await axios.post(self.matcherUrl + '/matcher/orderbook/' + assetname +'/' + marketid + '/cancel', paramsToDelete)
        ord = ord['data']

        return ord
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let self = this

        this.InitMatcher();
        let assetname = symbol.split('/')[0]
        let marketname = symbol.split('/')[1]

        let assetid = self.dexid[assetname]
        let marketid = self.dexid[marketname]

        let assetPrecision = self.decimals[assetname]
        let marketPrecision = self.decimals[marketname]

        const timestampOrd = Date.now()

        const paramsBytes = wc.concat(
            BASE58_STRING(self.publicKey),
            LONG(timestampOrd),
        )
        const signedBytes = wc.signBytes(paramsBytes, self.apiKey)

        const paramsHeader = {
            Accept: 'application/json',
            Timestamp: timestampOrd,
            Signature: signedBytes
        }

        let dexorders = await axios({
            method:'get',
            url: self.matcherUrl + '/matcher/orderbook/' + assetname +'/' + marketid + '/publicKey/' + self.publicKey,
            params: {
                activeOnly: true
            },
            headers: paramsHeader
        })
        dexorders = dexorders['data']

        let orders = []
        for (let i in dexorders) {
            let ord = {}
            ord['status'] = 'open'
            ord['symbol'] = symbol
            order['side'] = dexorders[i]['type']
            order['id'] = dexorders[i]['id']
            order['timestamp'] = dexorders[i]['timestamp']
            order['amount'] = parseFloat(dexorders[i]['amount']) / 10 ** assetPrecision
            order['filled'] = parseFloat(dexorders[i]['filled']) / 10 ** assetPrecision
            order['price'] = parseFloat(dexorders[i]['price']) / 10 ** (8 + marketPrecision - assetPrecision)
            orders.push(order)
        }

        return orders
    }

    // async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
    //     let orders = await this.fetchOrders (symbol, since, limit, params);
    //     return this.filterBy (orders, 'status', 'open');
    // }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'closed');
    }

    async fetchOrderBooks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let ids = undefined;
        if (symbols === undefined) {
            ids = this.ids.join ('-');
            // max URL length is 2083 symbols, including http schema, hostname, tld, etc...
            if (ids.length > 2048) {
                let numIds = this.ids.length;
                throw new ExchangeError (this.id + ' has ' + numIds.toString () + ' symbols exceeding max URL length, you are required to specify a list of symbols in the first argument to fetchOrderBooks');
            }
        } else {
            ids = this.marketIds (symbols);
            ids = ids.join ('-');
        }
        let response = await this.publicGetDepthPair (this.extend ({
            'pair': ids,
        }, params));
        let result = {};
        ids = Object.keys (response);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let symbol = id;
            if (id in this.markets_by_id) {
                let market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
            result[symbol] = this.parseOrderBook (response[id]);
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        //
        //   {    high: 0.03497582,
        //         low: 0.03248474,
        //         avg: 0.03373028,
        //         vol: 120.11485715062999,
        //     vol_cur: 3572.24914074,
        //        last: 0.0337611,
        //         buy: 0.0337442,
        //        sell: 0.03377798,
        //     updated: 1537522009          }
        //
        let timestamp = ticker['updated'] * 1000;
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let last = this.safeFloat (ticker, 'last');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'buy'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'sell'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': this.safeFloat (ticker, 'avg'),
            'baseVolume': this.safeFloat (ticker, 'vol_cur'),
            'quoteVolume': this.safeFloat (ticker, 'vol'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let ids = this.ids;
        if (symbols === undefined) {
            let numIds = ids.length;
            ids = ids.join ('-');
            let maxLength = this.safeInteger (this.options, 'fetchTickersMaxLength', 2048);
            // max URL length is 2048 symbols, including http schema, hostname, tld, etc...
            if (ids.length > this.options['fetchTickersMaxLength']) {
                throw new ArgumentsRequired (this.id + ' has ' + numIds.toString () + ' markets exceeding max URL length for this endpoint (' + maxLength.toString () + ' characters), please, specify a list of symbols of interest in the first argument to fetchTickers');
            }
        } else {
            ids = this.marketIds (symbols);
            ids = ids.join ('-');
        }
        let tickers = await this.publicGetTickerPair (this.extend ({
            'pair': ids,
        }, params));
        let result = {};
        let keys = Object.keys (tickers);
        for (let k = 0; k < keys.length; k++) {
            let id = keys[k];
            let ticker = tickers[id];
            let symbol = id;
            let market = undefined;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        let tickers = await this.fetchTickers ([ symbol ], params);
        return tickers[symbol];
    }

    parseTrade (trade, market = undefined) {
        let timestamp = this.safeInteger (trade, 'timestamp');
        if (timestamp !== undefined) {
            timestamp = timestamp * 1000;
        }
        let side = this.safeString (trade, 'type');
        if (side === 'ask') {
            side = 'sell';
        } else if (side === 'bid') {
            side = 'buy';
        }
        let price = this.safeFloat2 (trade, 'rate', 'price');
        let id = this.safeString2 (trade, 'trade_id', 'tid');
        let order = this.safeString (trade, this.getOrderIdKey ());
        if ('pair' in trade) {
            let marketId = this.safeString (trade, 'pair');
            market = this.safeValue (this.markets_by_id, marketId, market);
        }
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let amount = this.safeFloat (trade, 'amount');
        let type = 'limit'; // all trades are still limit trades
        let takerOrMaker = undefined;
        let fee = undefined;
        let feeCost = this.safeFloat (trade, 'commission');
        if (feeCost !== undefined) {
            let feeCurrencyId = this.safeString (trade, 'commissionCurrency');
            feeCurrencyId = feeCurrencyId.toUpperCase ();
            let feeCurrency = this.safeValue (this.currencies_by_id, feeCurrencyId);
            let feeCurrencyCode = undefined;
            if (feeCurrency !== undefined) {
                feeCurrencyCode = feeCurrency['code'];
            } else {
                feeCurrencyCode = this.commonCurrencyCode (feeCurrencyId);
            }
            fee = {
                'cost': feeCost,
                'currency': feeCurrencyCode,
            };
        }
        let isYourOrder = this.safeValue (trade, 'is_your_order');
        if (isYourOrder !== undefined) {
            takerOrMaker = 'taker';
            if (isYourOrder) {
                takerOrMaker = 'maker';
            }
            if (fee === undefined) {
                fee = this.calculateFee (symbol, type, side, amount, price, takerOrMaker);
            }
        }
        return {
            'id': id,
            'order': order,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'takerOrMaker': takerOrMaker,
            'price': price,
            'amount': amount,
            'fee': fee,
            'info': trade,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'pair': market['id'],
        };
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this.publicGetTradesPair (this.extend (request, params));
        if (Array.isArray (response)) {
            let numElements = response.length;
            if (numElements === 0) {
                return [];
            }
        }
        return this.parseTrades (response[market['id']], market, since, limit);
    }

    getOrderIdKey () {
        return 'order_id';
    }

    parseOrderStatus (status) {
        let statuses = {
            '0': 'open',
            '1': 'closed',
            '2': 'canceled',
            '3': 'canceled', // or partially-filled and still open? https://github.com/ccxt/ccxt/issues/1594
        };
        if (status in statuses) {
            return statuses[status];
        }
        return status;
    }

    parseOrder (order, market = undefined) {
        let id = order['id'].toString ();
        let status = this.parseOrderStatus (this.safeString (order, 'status'));
        let timestamp = parseInt (order['timestamp_created']) * 1000;
        let symbol = undefined;
        if (market === undefined) {
            market = this.markets_by_id[order['pair']];
        }
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let remaining = undefined;
        let amount = undefined;
        let price = this.safeFloat (order, 'rate');
        let filled = undefined;
        let cost = undefined;
        if ('start_amount' in order) {
            amount = this.safeFloat (order, 'start_amount');
            remaining = this.safeFloat (order, 'amount');
        } else {
            remaining = this.safeFloat (order, 'amount');
            if (id in this.orders)
                amount = this.orders[id]['amount'];
        }
        if (amount !== undefined) {
            if (remaining !== undefined) {
                filled = amount - remaining;
                cost = price * filled;
            }
        }
        let fee = undefined;
        let result = {
            'info': order,
            'id': id,
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'type': 'limit',
            'side': order['type'],
            'price': price,
            'cost': cost,
            'amount': amount,
            'remaining': remaining,
            'filled': filled,
            'status': status,
            'fee': fee,
        };
        return result;
    }

    parseOrders (orders, market = undefined, since = undefined, limit = undefined) {
        let ids = Object.keys (orders);
        let result = [];
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let order = orders[id];
            let extended = this.extend (order, { 'id': id });
            result.push (this.parseOrder (extended, market));
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        let idKey = this.getOrderIdKey ();
        request[idKey] = parseInt (id);
        let method = this.options['fetchOrderMethod'];
        let response = await this[method] (this.extend (request, params));
        id = id.toString ();
        let newOrder = this.parseOrder (this.extend ({ 'id': id }, response['return'][id]));
        let oldOrder = (id in this.orders) ? this.orders[id] : {};
        this.orders[id] = this.extend (oldOrder, newOrder);
        return this.orders[id];
    }

    updateCachedOrders (openOrders, symbol) {
        // update local cache with open orders
        // this will add unseen orders and overwrite existing ones
        for (let j = 0; j < openOrders.length; j++) {
            const id = openOrders[j]['id'];
            this.orders[id] = openOrders[j];
        }
        let openOrdersIndexedById = this.indexBy (openOrders, 'id');
        let cachedOrderIds = Object.keys (this.orders);
        for (let k = 0; k < cachedOrderIds.length; k++) {
            // match each cached order to an order in the open orders array
            // possible reasons why a cached order may be missing in the open orders array:
            // - order was closed or canceled -> update cache
            // - symbol mismatch (e.g. cached BTC/USDT, fetched ETH/USDT) -> skip
            let cachedOrderId = cachedOrderIds[k];
            let cachedOrder = this.orders[cachedOrderId];
            if (!(cachedOrderId in openOrdersIndexedById)) {
                // cached order is not in open orders array
                // if we fetched orders by symbol and it doesn't match the cached order -> won't update the cached order
                if (symbol !== undefined && symbol !== cachedOrder['symbol'])
                    continue;
                // cached order is absent from the list of open orders -> mark the cached order as closed
                if (cachedOrder['status'] === 'open') {
                    cachedOrder = this.extend (cachedOrder, {
                        'status': 'closed', // likewise it might have been canceled externally (unnoticed by "us")
                        'cost': undefined,
                        'filled': cachedOrder['amount'],
                        'remaining': 0.0,
                    });
                    if (cachedOrder['cost'] === undefined) {
                        if (cachedOrder['filled'] !== undefined) {
                            cachedOrder['cost'] = cachedOrder['filled'] * cachedOrder['price'];
                        }
                    }
                    this.orders[cachedOrderId] = cachedOrder;
                }
            }
        }
        return this.toArray (this.orders);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        // some derived classes use camelcase notation for request fields
        let request = {
            // 'from': 123456789, // trade ID, from which the display starts numerical 0 (test result: wavesdex ignores this field)
            // 'count': 1000, // the number of trades for display numerical, default = 1000
            // 'from_id': trade ID, from which the display starts numerical 0
            // 'end_id': trade ID on which the display ends numerical ∞
            // 'order': 'ASC', // sorting, default = DESC (test result: wavesdex ignores this field, most recent trade always goes last)
            // 'since': 1234567890, // UTC start time, default = 0 (test result: wavesdex ignores this field)
            // 'end': 1234567890, // UTC end time, default = ∞ (test result: wavesdex ignores this field)
            // 'pair': 'eth_btc', // default = all markets
        };
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['pair'] = market['id'];
        }
        if (limit !== undefined) {
            request['count'] = parseInt (limit);
        }
        if (since !== undefined) {
            request['since'] = parseInt (since / 1000);
        }
        let method = this.options['fetchMyTradesMethod'];
        let response = await this[method] (this.extend (request, params));
        let trades = [];
        if ('return' in response) {
            trades = response['return'];
        }
        return this.parseTrades (trades, market, since, limit);
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'coinName': currency['id'],
            'amount': parseFloat (amount),
            'address': address,
        };
        // no docs on the tag, yet...
        if (tag !== undefined) {
            throw new ExchangeError (this.id + ' withdraw() does not support the tag argument yet due to a lack of docs on withdrawing with tag/memo on behalf of the exchange.');
        }
        let response = await this.privatePostWithdrawCoin (this.extend (request, params));
        return {
            'info': response,
            'id': response['return']['tId'],
        };
    }

    signBodyWithSecret (body) {
        return this.hmac (this.encode (body), this.encode (this.secret), 'sha512');
    }

    getVersionString () {
        return '/' + this.version;
    }

    getPrivatePath (path, params) {
        return '';
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            url += this.getPrivatePath (path, params);
            this.checkRequiredCredentials ();
            let nonce = this.nonce ();
            body = this.urlencode (this.extend ({
                'nonce': nonce,
                'method': path,
            }, query));
            let signature = this.signBodyWithSecret (body);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Key': this.apiKey,
                'Sign': signature,
            };
        } else if (api === 'public') {
            url += this.getVersionString () + '/' + this.implodeParams (path, params);
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            url += '/' + this.implodeParams (path, params);
            if (method === 'GET') {
                if (Object.keys (query).length) {
                    url += '?' + this.urlencode (query);
                }
            } else {
                if (Object.keys (query).length) {
                    body = this.json (query);
                    headers = {
                        'Content-Type': 'application/json',
                    };
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode, reason, url, method, headers, body, response) {
        if (!this.isJsonEncodedObject (body))
            return; // fallback to default error handler
        if ('success' in response) {
            //
            // 1 - wavesdex only returns the integer 'success' key from their private API
            //
            //     { "success": 1, ... } httpCode === 200
            //     { "success": 0, ... } httpCode === 200
            //
            // 2 - However, exchanges derived from wavesdex, can return non-integers
            //
            //     It can be a numeric string
            //     { "sucesss": "1", ... }
            //     { "sucesss": "0", ... }, httpCode >= 200 (can be 403, 502, etc)
            //
            //     Or just a string
            //     { "success": "true", ... }
            //     { "success": "false", ... }, httpCode >= 200
            //
            //     Or a boolean
            //     { "success": true, ... }
            //     { "success": false, ... }, httpCode >= 200
            //
            // 3 - Oversimplified, Python PEP8 forbids comparison operator (===) of different types
            //
            // 4 - We do not want to copy-paste and duplicate the code of this handler to other exchanges derived from wavesdex
            //
            // To cover points 1, 2, 3 and 4 combined this handler should work like this:
            //
            let success = this.safeValue (response, 'success', false);
            if (typeof success === 'string') {
                if ((success === 'true') || (success === '1'))
                    success = true;
                else
                    success = false;
            }
            if (!success) {
                const code = this.safeString (response, 'code');
                const message = this.safeString (response, 'error');
                const feedback = this.id + ' ' + this.json (response);
                const exact = this.exceptions['exact'];
                if (code in exact) {
                    throw new exact[code] (feedback);
                }
                const broad = this.exceptions['broad'];
                const broadKey = this.findBroadlyMatchedKey (broad, message);
                if (broadKey !== undefined) {
                    throw new broad[broadKey] (feedback);
                }
                throw new ExchangeError (feedback); // unknown message
            }
        }
    }
};
