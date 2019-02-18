'use strict';

/* eslint-disable */

// ---------------------------------------------------------------------------

const okex = require ('./okex.js');
const { ExchangeError, ArgumentsRequired, DDoSProtection, InsufficientFunds, InvalidOrder, OrderNotFound, AuthenticationError } = require('./base/errors');

// ---------------------------------------------------------------------------

module.exports = class okex3 extends okex {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'okex',
            'name': 'OKEX v3',
            'countries': [ 'CN', 'US' ],
            'has': {
                'CORS': false,
                'futures': true,
                'fetchTickers': true,
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
                'password': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/32552768-0d6dd3c6-c4a6-11e7-90f8-c043b64756a7.jpg',
                'api': {
                    'public': 'https://www.okex.com/api',
                    'private': 'https://www.okex.com/api',
                },
                'www': 'https://www.okex.com',
                'doc': 'https://www.okex.com/docs/',
                'fees': 'https://www.okex.com/pages/products/fees.html',
            },
            'api': {
                'public': {
                    'get': [
                        'spot/v3/instruments/{symbol}/book',    // instrument-id
                        'spot/v3/instruments/ticker',
                        'spot/v3/instruments/{symbol}/ticker',
                        'spot/v3/instruments/{symbol}/trades',
                        'spot/v3/instruments/{symbol}/candles',
                        'futures/v3/instruments/{symbol}/book',
                        'futures/v3/instruments/ticker',
                        'futures/v3/instruments/{symbol}/ticker',
                        'futures/v3/instruments/{symbol}/trades',
                        'futures/v3/instruments/{symbol}/candles',
                        'general/v3/time',
                    ],
                },
                'private': {
                    'post': [
                        'account/v3/transfer',
                        'account/v3/withdrawal',
                    ],
                    'get': [
                        'account/v3/withdrawal/fee',
                    ],
                },
            },
        });
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = '/';
        url += this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path));
        if (api === 'private') {
            this.checkRequiredCredentials ();
            if (method === 'GET') {
                if (Object.keys (query).length)
                    url += '?' + this.urlencode (query);
            } else {
                body = this.json (query);
            }
            let seconds = this.milliseconds ();
            let timestamp = this.iso8601 (seconds + '-08:00');
            let payload = [timestamp, method, '/api' + url].join('');
            if (body) {
                payload += body;
            }
            let signature = this.hmac (payload, this.secret, 'sha256', 'base64');
            headers = {
                'OK-ACCESS-KEY': this.apiKey,
                'OK-ACCESS-SIGN': this.decode (signature),
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': this.password,
                'Content-Type': 'application/json',
            };
        } else {
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        }
        url = this.urls['api'][api] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        let market = symbol.replace('/', '-').replace('_', '-');
        if (limit !== undefined)
            params['size'] = limit;
        // return this.parseOrderBook (orderbook);
        let ob = await this.request ('spot/v3/instruments/' + market + '/book', 'public', 'GET', params, undefined, undefined)
        // let ob = this.fetch (request.url, request.method, request.headers, request.body)
        return this.parseOrderBook (ob)
    }

    async fetchBalance (params = {}) {
        let self = this
        let response = await this.request ('spot/v3/accounts/', 'private', 'GET', params, undefined, undefined)
        // let balances = response['info']['funds'];
        let result = { 'info': response };

        for (let i in response) {
            let account = self.account ()
            account['free'] = response[i]['available']
            account['used'] = response[i]['holds']
            account['total'] = response[i]['balance']
            result[response[i]['currency']] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (symbol !== undefined)
            params['instrument_id'] = symbol.replace('/', '-').replace('_', '-');
        if (limit !== undefined)
            params['limit'] = limit.toString();

        let response = await this.request ('spot/v3/orders_pending', 'private', 'GET', params, undefined, undefined)
        let orders = []
        for (let i in response) {
            let o = response[i]
            let order = {
                'id': o['order_id'],
                'datetime': o['created_at'],
                'timestamp': o['timestamp'],
                'lastTradeTimestamp': o['timestamp'],
                'status': 'open',
                'symbol': symbol,
                'type': o['type'],
                'side': o['side'],
                'price': o['price'],
                'amount': o['size'],
                'filled': o['filled_size'],
                'remaining': parseFloat(o['size']) - parseFloat(o['filled_size']),
                'cost': 0,
                'trades': [],
                'fee': {
                    'currency': 'BTC',
                    'cost': 0,
                    'rate': 0,
                },
                'info': o,
            }
            orders.push(order)
        }

        return orders
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (symbol !== undefined)
            params['instrument_id'] = symbol.replace('/', '-').replace('_', '-');
        if (limit !== undefined)
            params['limit'] = limit.toString();
        params['status'] = 'all'

        let response = await this.request ('spot/v3/orders', 'private', 'GET', params, undefined, undefined)
        let orders = []
        for (let i in response) {
            let o = response[i]
            if (o['status'] !== 'open' && o['status'] !== 'cancelled') {
                let order = {
                    'id': o['order_id'],
                    'datetime': o['created_at'],
                    'timestamp': o['timestamp'],
                    'lastTradeTimestamp': o['timestamp'],
                    'status': o['status'],
                    'symbol': symbol,
                    'type': o['type'],
                    'side': o['side'],
                    'price': o['price'],
                    'amount': o['size'],
                    'filled': o['filled_size'],
                    'remaining': parseFloat(o['size']) - parseFloat(o['filled_size']),
                    'cost': 0,
                    'trades': [],
                    'fee': {
                        'currency': 'BTC',
                        'cost': 0,
                        'rate': 0,
                    },
                    'info': o,
                }
                orders.push(order)
            }
        }

        return orders
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        params = {
            'type': 'limit',
            'size': amount.toString(),
            'price': price.toString(),
            'instrument_id': symbol.replace('/', '-').replace('_', '-'),
            'side': side
        }
        return await this.request ('spot/v3/orders', 'private', 'POST', params, undefined, undefined)
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        if (symbol === undefined)
            throw new ArgumentsRequired (this.id + ' cancelOrder() requires a symbol argument');

        params = {
            'instrument_id': symbol.replace('/', '-').replace('_', '-')
        }

        return await this.request ('spot/v3/cancel_orders/' + id.toString(), 'private', 'POST', params, undefined, undefined)
    }
};
