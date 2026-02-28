import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/auth.js";
import socketService from "../utils/socket.js";

const REFRESH_MS = 3000;

const CircuitLivePage = () => {
  const { state } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  const relayState = useMemo(() => (data?.relayState === 1 ? 1 : 0), [data]);

  const fetchStatus = async () => {
    try {
      const response = await api.get("/iot/status");
      if (response.data?.success) {
        setData(response.data.data);
        setError("");
      } else {
        setError(response.data?.message || "Failed to load circuit status");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load circuit status");
    } finally {
      setLoading(false);
    }
  };

  const setRelay = async (nextState) => {
    try {
      setToggling(true);
      const response = await api.post("/iot/relay", { state: nextState });
      if (response.data?.success) {
        setData(response.data.data);
        setError("");
      } else {
        setError(response.data?.message || "Failed to update relay");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update relay");
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated || !state.token) return;

    socketService.connect(null, state.user?.city || null, state.token);
    const onIotStatus = (payload) => {
      if (payload && typeof payload === "object") {
        setData(payload);
      }
    };
    socketService.on("iot-status", onIotStatus);

    return () => {
      socketService.off("iot-status", onIotStatus);
    };
  }, [state.isAuthenticated, state.token, state.user?.city]);

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="ev-container">
        <div className="ev-formal-card ev-card-spacing mb-6">
          <div className="ev-section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="ev-formal-title">Circuit Live Charging</h1>
                <p className="ev-formal-subtitle">Live Blynk data (V0/V1/V2) and relay control (V3)</p>
              </div>
              <a href="/dashboard" className="ev-formal-button w-full sm:w-auto text-center">
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div className="ev-formal-card ev-formal-compact p-5">
            <p className="ev-formal-subtitle mb-2">Voltage</p>
            <p className="text-3xl font-bold text-white">
              {data?.voltage != null ? `${Number(data.voltage).toFixed(2)} V` : "--"}
            </p>
          </div>

          <div className="ev-formal-card ev-formal-compact p-5">
            <p className="ev-formal-subtitle mb-2">Battery</p>
            <p className="text-3xl font-bold text-white">
              {data?.batteryPercent != null ? `${Math.round(Number(data.batteryPercent))}%` : "--"}
            </p>
          </div>

          <div className="ev-formal-card ev-formal-compact p-5">
            <p className="ev-formal-subtitle mb-2">Status</p>
            <p className="text-2xl font-bold text-white">{data?.status || "--"}</p>
          </div>
        </div>

        <div className="ev-formal-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Relay Control</h2>
              <p className="ev-formal-subtitle">
                Current relay: <span className="text-white font-medium">{relayState === 1 ? "ON" : "OFF"}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Last update: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "--"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                disabled={toggling || relayState === 1}
                onClick={() => setRelay(1)}
                className="ev-formal-button w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Turn ON
              </button>
              <button
                disabled={toggling || relayState === 0}
                onClick={() => setRelay(0)}
                className="ev-formal-button w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Turn OFF
              </button>
              <button
                disabled={loading}
                onClick={fetchStatus}
                className="ev-formal-button w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-gray-300">Loading circuit data...</div>
        )}

        {error && (
          <div className="mt-4 text-red-400">{error}</div>
        )}
      </div>
    </div>
  );
};

export default CircuitLivePage;
