CREATE TABLE IF NOT EXISTS wallet_whitelist (
    wallet_address VARCHAR(44) PRIMARY KEY NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    added_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with a placeholder wallet for testing
-- Replace with actual whitelisted wallet addresses
INSERT INTO wallet_whitelist (wallet_address) VALUES 
('2PDRxkCkd6m7UxCcpo7rmvUNL9ZteSEmMtZW7f7udyre'),
('F5tvGTZFgJFQgZaZUFHm1VWHYktiUoX3UZkhKvB2fsmA'),
('CZSwCmYz2o4Y6mVR4J9HLgdt39rSBeGL9FyH2v27bJxS'),
('EQDhVGwC4S8k8JYJ5samq9Nh6SkXJ1vZRqDSKyMPbetn'),
('CXm2NYri3iL6vBsJi1uZ4JdcSZA8dURpd8YcW7uT4R6v'),
('F93g8hchbn5cBbiecQJtzzMoHhRSjA7PrM788CotSAR3'),
('HxPYkwaBJHfWL9k9Lnoyw82njqkfGF44cf3jusK4bBdS'),
('2nxfYLfcr3k5e8dHurST8ZPhKvHuqQFSR9wQgCSvfkfn'),
('4LtDp9pmdg4zU1cq4sDTCP5sdQRvbJgi1VmTukkfK3MM'),
('GY6aZLvKvp82bCDhkeu2Zd8MVyLTxcE631CMUrtw7XPj'),
('AjRNyW8WRjCPZY8YSCJMtrUNsMdEXULJVJ8tzucTW6d1'),
('C7uyS5MFtKzxv93iuvFnbC2fDNQQy1mZ5iUmmJN1mwFV'),
('HYYxg2tnHr6x95hZgsxvsHfgqqWZhbQYE4QGEY6fHcSL'),
('HC825HoNMvoGUSn3z1LyPBooauoCKcdpNsiiV7vb7v2z'),
('v66TPF88RmpSYCjrDjTKTvHSdZYcyzhn5B1BnGX2RfW'),
('Er8DXXF9RZMF2jkUom1Z9cSaj5e2Zn5moAsUEjcT9Et7'),
('FpqJ5KiFQHrBGMc5d2mhKMs8zWzCXErz6cF4c2aeJkNe'),
('JC7dUWZaDd2hE8nSowdBW7cUvZCyA5WaVcENnEezYKGE'),
('7PVjW8p5usi6jSG3SAgdgB7xNe4V7JALWM1wA3R2L4qG')
ON CONFLICT (wallet_address) DO NOTHING; 
