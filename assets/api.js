/*jshint esversion: 8 */

/**
 * @typedef {(value?: any) => void} ResolveFunction {@link Promise}'s `resolve` function
 * @typedef {(reason?: any) => void} RejectFunction {@link Promise}'s `reject` function
 * @typedef {{resolve: ResolveFunction, reject: RejectFunction}} ResolveRejectPair Pair of {@link Promise}'s  `resolve/reject` functions
 * @typedef {{postMessage: (message: string) => void}} SSIChannel
 * @var {SSIChannel} _ssiChannel SSI channel defined by Flutter backend.
 */

/**
 * SSI glue functions used with {@link ssiChannel}.
 */
const _ssiGlue = {
  /** @type {Object.<number, ResolveRejectPair>}
   * `id` to {@link Promise}'s `resolve/reject` functions mapping.
  */
  _promises: {},
  /** `id` to be used next. */
  _promises_id: 0,
  /**
   * Internal: Register {@link Promise}'s `resolve/reject` functions to use later on `_complete` callback.
   * @param {ResolveFunction} resolve
   * @param {RejectFunction} reject
   * @returns {number} ID of the promise registered.
   */
  _registerPromise: function(resolve, reject) {
    const id = _ssiGlue._promises_id++;
    _ssiGlue._promises[id] = { resolve, reject };
    return id;
  },
  /**
   * Internal: Call `func` and wait for response for `id`.
   * @param {(id: number) => void} func Function to execute before waiting for response from Flutter backend.
   * @returns {Promise} Response object from Flutter backend.
   */
  _waitForResponse: function(func) {
      return new Promise((resolve, reject) => {
          const id = _ssiGlue._registerPromise(resolve, reject);
          func(id);
      });
  },
  /**
   * Internal: Called from Flutter backend to response back to JS's sendObject call.
   * @param {number} `id` to respond.
   * @param {string} objStr Response object.
   * @param {*} objError Error object on error or `null`.
   */
  _complete: function(id, objStr, objError) {
    if (objError) {
        _ssiGlue._promises[id].reject(objError);
    } else {
        _ssiGlue._promises[id].resolve(JSON.parse(objStr));
    }
    delete _ssiGlue._promises[id];
  },
  /**
   * Invoke command on Flutter backend.
   * @param {string} command Command to invoke.
   * @param {*} arg Command argument in any form.
   * @returns Response object from Flutter backend.
   */
  invoke: function(command, arg) {
    return _ssiGlue._waitForResponse((id) => {
      const data = { command, id, arg: arg };
      _ssiChannel.postMessage(`${JSON.stringify(data)}`);
    });
  },
};

/**
 * FIXME: Simple Sample SSI code.
 */
var SsiTest = (function() {
  class SsiTestImpl {
    constructor() {
      this.someFunc = async function (obj) {
        console.log(`someFunc start: ${JSON.stringify(obj)}`);
        var ret = await _ssiGlue.invoke('someFunc', obj);
        console.log(`someFunc end: ${JSON.stringify(ret)}`);
        return ret;
      };
    }
  }
  return SsiTestImpl;
}());

// We defines onSsiAvailable to notify when SSI function ready
if (window.onSsiAvailable) {
  window.onSsiAvailable(new SsiTest());
}
