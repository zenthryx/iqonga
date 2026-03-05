const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

module.exports = {
  connect: async () => {
    if (!client.isOpen) {
      await client.connect();
    }
  },
  disconnect: async () => {
    if (client.isOpen) {
      await client.disconnect();
    }
  },
  ping: async () => {
    return await client.ping();
  },
  client
};
