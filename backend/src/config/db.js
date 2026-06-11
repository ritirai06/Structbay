const dns = require('dns');
const mongoose = require('mongoose');
const logger = require('./logger');

/** Prefer IPv4 first (helps some Windows / dual-stack setups after DNS resolves). */
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    /* ignore */
  }
}

const connectOptions = {
  dbName: 'structbay',
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
};

function connectionCandidates() {
  const primary = (process.env.MONGODB_URI || '').trim();
  const direct = (process.env.MONGODB_URI_DIRECT || '').trim();
  const list = [];
  if (primary) list.push({ uri: primary, label: 'MONGODB_URI' });
  if (direct && direct !== primary) list.push({ uri: direct, label: 'MONGODB_URI_DIRECT' });
  return list;
}

/** Comma-separated list, e.g. `8.8.8.8,8.8.4.4` — overrides OS resolver for this Node process. */
function applyCustomDnsServers() {
  const raw = (process.env.MONGODB_DNS_SERVERS || '').trim();
  if (!raw) return false;
  const servers = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!servers.length) return false;
  try {
    dns.setServers(servers);
    logger.info(`MongoDB: using DNS servers from MONGODB_DNS_SERVERS: ${servers.join(', ')}`);
    return true;
  } catch (e) {
    logger.warn(`MongoDB: MONGODB_DNS_SERVERS invalid: ${e.message}`);
    return false;
  }
}

async function disconnectIfNeeded() {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
}

/**
 * Many Windows setups return querySrv ECONNREFUSED with the default resolver; the same URI
 * often works after switching this process to public DNS (see MONGODB_DNS_SERVERS).
 */
async function connectOnce(uri) {
  await disconnectIfNeeded();
  return mongoose.connect(uri, connectOptions);
}

async function connectWithSrvDnsRetry(uri, label) {
  try {
    await connectOnce(uri);
    return;
  } catch (firstErr) {
    const isSrv = String(uri).startsWith('mongodb+srv');
    const isQuerySrv = String(firstErr.message).includes('querySrv');
    if (!isSrv || !isQuerySrv) throw firstErr;

    logger.warn(`MongoDB (${label}): querySrv failed — retrying same URI with public DNS (8.8.8.8, 8.8.4.4, 1.1.1.1)…`);
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    } catch (e) {
      logger.warn(`MongoDB: could not set public DNS: ${e.message}`);
      throw firstErr;
    }
    await connectOnce(uri);
    logger.info(`MongoDB (${label}): connected after switching to public DNS resolvers.`);
  }
}

function wireConnectionEvents() {
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
  });
}

const connectDB = async () => {
  if ((process.env.MONGODB_DNS_SERVERS || '').trim()) {
    applyCustomDnsServers();
  }

  const candidates = connectionCandidates();
  if (candidates.length === 0) {
    logger.error('No MongoDB URI: set MONGODB_URI in backend/.env (see .env.example).');
    process.exit(1);
  }

  if (candidates.length === 1 && candidates[0].uri.startsWith('mongodb+srv')) {
    logger.info('MongoDB: only MONGODB_URI is set (SRV). If connection fails, add MONGODB_URI_DIRECT with Atlas standard mongodb://… string.');
  }

  let lastError = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const { uri, label } = candidates[i];
    try {
      if (uri.startsWith('mongodb+srv')) {
        await connectWithSrvDnsRetry(uri, label);
      } else {
        await connectOnce(uri);
      }

      wireConnectionEvents();
      if (i > 0) {
        logger.warn(`MongoDB connected using fallback ${label} (primary URI failed).`);
      } else {
        logger.info(`MongoDB connected: ${mongoose.connection.host}`);
      }
      return;
    } catch (error) {
      lastError = error;
      logger.warn(`MongoDB (${label}) failed: ${error.message}`);
      await disconnectIfNeeded();
    }
  }

  const error = lastError || new Error('Unknown connection error');
  logger.error(`MongoDB connection failed: ${error.message}`);
  if (String(error.message).includes('querySrv') || String(error.message).includes('ECONNREFUSED')) {
    logger.error(
      'Hint: SRV/DNS or TCP refused. Try: (1) MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4 in .env (applied before connect), ' +
        '(2) Atlas Network Access + resume cluster, (3) MONGODB_URI_DIRECT = Atlas standard mongodb://… (no +srv), ' +
        '(4) local: MONGODB_URI=mongodb://127.0.0.1:27017'
    );
  }
  process.exit(1);
};

module.exports = connectDB;
