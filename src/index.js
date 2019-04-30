const getRandomString = require('./utils/getRandomString');

const stringifyRequest = (id, method, params) => JSON.stringify({
  jsonrpc: '2.0', id, method, params,
});

const stringifyResult = (id, result) => JSON.stringify({
  jsonrpc: '2.0', id, result,
});

const stringifyError = (id, error) => JSON.stringify({
  jsonrpc: '2.0', id, error: error.toString(),
});

module.exports = class RPCClient {
  /**
   * Creates new RPCClient instance
   * @param {function} send Function to send messages
   * @param { { log: boolean } } [options]
   */
  constructor(send, options = {}) {
    this.options = options;

    this.requestCallbacksMap = new Map();
    this.handlersMap = new Map();

    this.send = message => send(message);
  }

  async handle(rawMessage) {
    try {
      const message = JSON.parse(rawMessage);
      const {
        id, result, error, method, params,
      } = message;

      if (method) { // server request
        if (this.options.log) {
          console.log('<- Server', message);
        }

        const handler = this.handlersMap.get(method);

        if (!handler) {
          console.log(`No handler registered for '${method}'`);

          const messageString = stringifyError(id, { code: -32601, message: 'Method not found' });

          if (this.options.log) {
            console.log('<- Server', messageString);
          }

          this.send(messageString);
        }

        try {
          const handlerResult = await handler(params);
          const messageString = stringifyResult(id, handlerResult);

          if (this.options.log) {
            console.log('<- Server', messageString);
          }

          this.send(messageString);
        } catch (handlerErr) {
          console.error(handlerErr);

          const messageString = stringifyError(id, handlerErr);

          if (this.options.log) {
            console.log('-> Server', messageString);
          }

          this.send(messageString);
        }
      } else { // client response
        if (this.options.log) {
          console.log('<- Client', message);
        }

        const callback = this.requestCallbacksMap.get(id);

        if (callback) {
          callback(error, result);
        } else {
          console.error(`Callback for response '${id}' not found`);
        }
      }
    } catch (parseErr) {
      this.send(stringifyError(undefined, { code: -32700, message: 'Parse error' }));
    }
  }

  request(method, params) {
    const id = getRandomString(10);

    const promise = new Promise((resolve, reject) => {
      this.requestCallbacksMap.set(id, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const requestString = stringifyRequest(id, method, params);

    if (this.options.log) {
      console.log('-> Client', { id, method, params });
    }

    this.send(requestString);

    return promise;
  }

  /**
   * Registers handler for method
   * @param {string} method Name of method
   * @param {(params) => any} handler Handler
   */
  on(method, handler) {
    this.handlersMap.set(method, handler);
  }
};
