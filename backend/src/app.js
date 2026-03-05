const wordpressRoutes = require('./routes/wordpress');

// Mount WordPress API routes
app.use('/api', wordpressRoutes);