const logger           = require('../config/logger');
const CommunicationLog = require('../models/CommunicationLog');
const MobileDevice     = require('../models/MobileDevice');

// Lazy-init Firebase Admin to avoid crash if not configured
let _messaging = null;
const getMessaging = () => {
  if (_messaging) return _messaging;
  if (!process.env.FIREBASE_PROJECT_ID) {
    logger.warn('Firebase not configured — push notifications disabled.');
    return null;
  }
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:    process.env.FIREBASE_PROJECT_ID,
          clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    _messaging = admin.messaging();
    return _messaging;
  } catch (err) {
    logger.error(`Firebase init error: ${err.message}`);
    return null;
  }
};

// ─── Send push to a single device token ──────────────────────────────────────
const sendToToken = async ({ token, title, body, data = {}, imageUrl }) => {
  const messaging = getMessaging();
  if (!messaging) return null;

  try {
    const message = {
      token,
      notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    const msgId = await messaging.send(message);
    logger.info(`Push sent: ${msgId}`);
    return { messageId: msgId };
  } catch (err) {
    logger.error(`Push failed to ${token}: ${err.message}`);
    // Mark stale token
    if (err.code === 'messaging/invalid-registration-token' || err.code === 'messaging/registration-token-not-registered') {
      await MobileDevice.findOneAndUpdate({ deviceToken: token }, { isActive: false });
    }
    return null;
  }
};

// ─── Send push to all active devices of a user ───────────────────────────────
const sendToUser = async ({ userId, userModel = 'User', title, body, data = {} }) => {
  const devices = await MobileDevice.find({ user: userId, userModel, isActive: true });
  if (!devices.length) return;

  const results = await Promise.allSettled(
    devices.map((d) => sendToToken({ token: d.deviceToken, title, body, data }))
  );

  await CommunicationLog.create({
    channel: 'PUSH', event: data.event || 'PUSH',
    recipient: userId.toString(), recipientType: userModel === 'Vendor' ? 'VENDOR' : 'CUSTOMER',
    recipientRef: userId, subject: title, body,
    status: results.some((r) => r.status === 'fulfilled' && r.value) ? 'SENT' : 'FAILED',
    sentAt: new Date(),
  }).catch(() => {});
};

// ─── Register / update device token ──────────────────────────────────────────
const registerDevice = async ({ userId, userModel = 'User', deviceToken, platform, appVersion, deviceModel, osVersion }) => {
  await MobileDevice.findOneAndUpdate(
    { deviceToken },
    { user: userId, userModel, deviceToken, platform, appVersion, deviceModel, osVersion, isActive: true, lastSeenAt: new Date() },
    { upsert: true, new: true }
  );
};

// ─── Deregister device (logout) ───────────────────────────────────────────────
const deregisterDevice = async (deviceToken) => {
  await MobileDevice.findOneAndUpdate({ deviceToken }, { isActive: false });
};

module.exports = { sendToToken, sendToUser, registerDevice, deregisterDevice };
