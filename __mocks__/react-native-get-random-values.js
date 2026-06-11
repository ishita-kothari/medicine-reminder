// Mock for react-native-get-random-values in Jest environment
// Node's crypto.getRandomValues is available natively
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto || {
    getRandomValues: (arr) => require('crypto').randomFillSync(arr),
  };
}
