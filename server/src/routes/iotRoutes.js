import express from "express";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const BLYNK_BASE_URL = "https://blynk.cloud/external/api";
const CACHE_TTL_MS = 2500;
const RELAY_MIN_INTERVAL_MS = parseInt(process.env.IOT_RELAY_MIN_INTERVAL_MS || "1500", 10);
const IOT_ALLOW_RELAY_TEST = String(process.env.IOT_ALLOW_RELAY_TEST || "false").toLowerCase() === "true";

let latestSnapshot = null;
let latestSnapshotAt = 0;
let lastRelayWriteAt = 0;

const getBlynkToken = () => process.env.BLYNK_AUTH_TOKEN?.trim();

const ensureBlynkConfigured = () => {
  if (!getBlynkToken()) {
    const error = new Error("BLYNK_AUTH_TOKEN is not configured");
    error.statusCode = 503;
    throw error;
  }
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildSnapshotFromPins = (pins) => ({
  voltage: toNumberOrNull(pins.V0),
  batteryPercent: toNumberOrNull(pins.V1),
  status: typeof pins.V2 === "string" ? pins.V2 : "",
  relayState: Number(pins.V3) === 1 ? 1 : 0,
  updatedAt: new Date().toISOString(),
  source: "blynk"
});

const readBlynkPin = async (pin) => {
  ensureBlynkConfigured();
  const token = getBlynkToken();

  const url = `${BLYNK_BASE_URL}/get?token=${encodeURIComponent(token)}&${pin}`;
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Blynk read failed for ${pin}: ${text || response.statusText}`);
  }

  return text;
};

const writeBlynkPin = async (pin, value) => {
  ensureBlynkConfigured();
  const token = getBlynkToken();

  const url = `${BLYNK_BASE_URL}/update?token=${encodeURIComponent(token)}&${pin}=${encodeURIComponent(String(value))}`;
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Blynk write failed for ${pin}: ${text || response.statusText}`);
  }
};

const getLiveSnapshot = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && latestSnapshot && now - latestSnapshotAt < CACHE_TTL_MS) {
    return latestSnapshot;
  }

  const [v0, v1, v2, v3] = await Promise.all([
    readBlynkPin("V0"),
    readBlynkPin("V1"),
    readBlynkPin("V2"),
    readBlynkPin("V3")
  ]);

  latestSnapshot = buildSnapshotFromPins({ V0: v0, V1: v1, V2: v2, V3: v3 });
  latestSnapshotAt = now;
  return latestSnapshot;
};

const maybeEmitStatus = (req, payload) => {
  const io = req.app.get("io");
  if (io) {
    io.emit("iot-status", payload);
  }
};

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const data = await getLiveSnapshot();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/iot/status failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to read IoT status"
    });
  }
});

router.post("/relay", authMiddleware, async (req, res) => {
  try {
    ensureBlynkConfigured();

    const state = Number(req.body?.state);
    if (![0, 1].includes(state)) {
      return res.status(400).json({
        success: false,
        message: "state must be 0 or 1"
      });
    }

    const now = Date.now();
    if (now - lastRelayWriteAt < RELAY_MIN_INTERVAL_MS) {
      return res.status(429).json({
        success: false,
        message: `Relay command rate-limited. Wait ${RELAY_MIN_INTERVAL_MS}ms between commands.`
      });
    }

    lastRelayWriteAt = now;
    await writeBlynkPin("V3", state);

    const live = await getLiveSnapshot({ force: true });
    const data = {
      ...live,
      relayState: state,
      status: state === 1 ? "Charging" : live.status || "Discharging",
      commandIssuedBy: req.user?._id?.toString() || null,
      commandIssuedAt: new Date().toISOString()
    };

    latestSnapshot = data;
    latestSnapshotAt = Date.now();
    maybeEmitStatus(req, data);

    return res.json({
      success: true,
      message: state === 1 ? "Relay turned on" : "Relay turned off",
      data
    });
  } catch (error) {
    console.error("POST /api/iot/relay failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update relay state"
    });
  }
});

router.post("/relay/test", authMiddleware, async (req, res) => {
  try {
    if (!IOT_ALLOW_RELAY_TEST) {
      return res.status(403).json({
        success: false,
        message: "Relay test endpoint is disabled. Set IOT_ALLOW_RELAY_TEST=true to enable."
      });
    }

    const state = Number(req.body?.state);
    if (![0, 1].includes(state)) {
      return res.status(400).json({
        success: false,
        message: "state must be 0 or 1"
      });
    }

    const data = {
      ...(latestSnapshot || {}),
      relayState: state,
      status: state === 1 ? "Charging (test)" : "Discharging (test)",
      updatedAt: new Date().toISOString(),
      source: "relay-test",
      commandIssuedBy: req.user?._id?.toString() || null
    };
    latestSnapshot = data;
    latestSnapshotAt = Date.now();
    maybeEmitStatus(req, data);

    return res.json({
      success: true,
      message: state === 1 ? "Relay test on event emitted" : "Relay test off event emitted",
      data
    });
  } catch (error) {
    console.error("POST /api/iot/relay/test failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Relay test failed"
    });
  }
});

export default router;
