class MonitoringService {
  constructor(database, redis) {
    this.database = database;
    this.redis = redis;
  }

  startRealtimeMonitoring() {
    console.log('Monitoring service started');
  }
}

module.exports = MonitoringService;
