"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Camera, CameraOff, FileText, Menu, Mic, MicOff, Moon, PhoneOff, Sun, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveConsultationNotes } from "@/lib/api";

type Role = "doctor" | "user";

type Props = {
  role: Role;
  roomId: string;
  appointmentId: number;
  selfName: string;
  peerName: string;
  defaultNotes?: string;
};

type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  from?: Role;
};

const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL;
const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME;
const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/backend";

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  if (TURN_URL) {
    const urls = TURN_URL
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);

    if (urls.length) {
      servers.push({
        urls: urls.length === 1 ? urls[0] : urls,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      });
    }
  }

  return servers;
}

const ICE_SERVERS: RTCIceServer[] = buildIceServers();

function resolveSocketUrl() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (socketUrl && /^https?:\/\//.test(socketUrl)) {
    return socketUrl.replace(/\/$/, "");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//.test(apiUrl)) {
    try {
      const parsed = new URL(apiUrl);
      return parsed.origin;
    } catch {
      return apiUrl.replace(/\/$/, "");
    }
  }

  if (typeof window !== "undefined" && window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:10000`;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

async function resolveSocketAuthToken(forceSessionRefresh = false): Promise<string | null> {
  const stored = typeof window !== "undefined" ? localStorage.getItem("telehealthAccessToken") : null;

  if (stored && !forceSessionRefresh) {
    return stored;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/session`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return stored;
    }

    const payload = (await response.json()) as { authenticated?: boolean; accessToken?: string };
    if (payload?.authenticated && typeof payload.accessToken === "string" && payload.accessToken.length > 20) {
      localStorage.setItem("telehealthAccessToken", payload.accessToken);
      return payload.accessToken;
    }
  } catch {
    // Ignore session fetch failures and fall back to locally stored token.
  }

  return stored;
}

export default function VideoRoomClient({
  role,
  roomId,
  appointmentId,
  selfName,
  peerName,
  defaultNotes = "",
}: Props) {
  const router = useRouter();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const creatingOfferRef = useRef(false);
  const authRetryAttemptedRef = useRef(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState("Connecting secure call...");
  const [peerConnected, setPeerConnected] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(defaultNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [endingCall, setEndingCall] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabel = role === "doctor" ? "doctor" : "patient";
  const dashboardPath = role === "doctor" ? "/doctor/video/dashboard" : "/patient/video/dashboard";

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial: "light" | "dark" =
      saved === "light" || saved === "dark"
        ? saved
        : "light";

    document.documentElement.classList.toggle("dark", initial === "dark");
    localStorage.setItem("theme", initial);
    setTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  const cleanupConnection = useCallback(() => {
    const socket = socketRef.current;
    const pc = pcRef.current;

    socket?.removeAllListeners();
    socket?.disconnect();
    socketRef.current = null;

    pc?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const emitSignal = useCallback((payload: SignalPayload) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("signal", { roomId, ...payload });
  }, [roomId]);

  const flushPendingIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queued = pendingIceCandidatesRef.current;
    if (!queued.length) return;

    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates from older negotiation rounds.
      }
    }
  }, []);

  const createOffer = useCallback(async (iceRestart = false) => {
    if (role !== "doctor") return;
    const pc = pcRef.current;
    if (!pc || creatingOfferRef.current) return;

    if (pc.signalingState !== "stable" && !iceRestart) {
      return;
    }

    try {
      creatingOfferRef.current = true;
      const offer = await pc.createOffer({ iceRestart });
      await pc.setLocalDescription(offer);
      emitSignal({ sdp: offer });
      setCallStatus("Calling participant...");
    } catch {
      toast.error("Failed to create a secure connection offer.");
    } finally {
      creatingOfferRef.current = false;
    }
  }, [emitSignal, role]);

  const handleSignal = useCallback(async (payload: SignalPayload) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (payload.sdp) {
        if (payload.sdp.type === "answer" && pc.signalingState !== "have-local-offer") {
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushPendingIceCandidates();

        if (payload.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitSignal({ sdp: answer });
          setCallStatus("Secure channel established.");
        }
      }

      if (payload.candidate) {
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(payload.candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch {
      toast.error("WebRTC signaling failed. Reconnecting...");
    }
  }, [emitSignal, flushPendingIceCandidates]);

  const setupPeerConnection = useCallback((localStream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== incomingStream) {
          remoteVideoRef.current.srcObject = incomingStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
      setPeerConnected(true);
      setCallStatus("Connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitSignal({ candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setPeerConnected(true);
        toast.success("Secure call connected.");
        setCallStatus("Connected");
      }

      if (state === "disconnected") {
        setCallStatus("Connection interrupted...");
        toast.warning("Connection interrupted. Reconnecting...");
      }

      if (state === "failed" && role === "doctor") {
        toast.error("Connection failed. Restarting call negotiation...");
        createOffer(true).catch(() => {});
      }
    };
  }, [createOffer, emitSignal, role]);

  useEffect(() => {
    mountedRef.current = true;

    const run = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mountedRef.current) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        setupPeerConnection(localStream);

        const authToken = await resolveSocketAuthToken();
        const socket = io(resolveSocketUrl(), {
          transports: ["websocket", "polling"],
          withCredentials: true,
          timeout: 15000,
          auth: authToken ? { token: authToken } : undefined,
        });
        socketRef.current = socket;

        console.info("[video-debug] socket init", {
          role,
          roomId,
          socketUrl: resolveSocketUrl(),
          hasAuthToken: Boolean(authToken),
          apiBase: process.env.NEXT_PUBLIC_API_URL || "/backend",
          origin: typeof window !== "undefined" ? window.location.origin : "server",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        });

        socket.on("connect", () => {
          authRetryAttemptedRef.current = false;
          console.info("[video-debug] socket connected", {
            socketId: socket.id,
            role,
            roomId,
          });
          socket.emit("join-room", { roomId, role });
          setCallStatus("Joined secure room");
        });

        socket.on("connect_error", (error) => {
          console.error("[video-debug] socket connect_error", {
            role,
            roomId,
            socketUrl: resolveSocketUrl(),
            message: error?.message,
            name: error?.name,
            description: (error as Error & { description?: unknown })?.description,
            context: (error as Error & { context?: unknown })?.context,
            data: (error as Error & { data?: unknown })?.data,
            stack: error?.stack,
          });
          const message = error?.message?.toLowerCase() || "";
          if (message.includes("authentication") || message.includes("token") || message.includes("expired")) {
            if (!authRetryAttemptedRef.current) {
              authRetryAttemptedRef.current = true;
              resolveSocketAuthToken(true)
                .then((freshToken) => {
                  if (!freshToken || !socketRef.current) return;
                  socketRef.current.auth = { token: freshToken };
                  socketRef.current.connect();
                })
                .catch(() => {});
            }
            toast.error("Video auth failed. Please log in again and reopen the room.");
          } else if (message.includes("cors")) {
            toast.error("Socket CORS blocked. Verify frontend URL is allowed on backend.");
          } else {
            toast.error("Signal server not reachable. Reconnecting...");
          }
          setCallStatus("Reconnecting securely...");
        });

        socket.on("doctor-joined", (payload: { message?: string }) => {
          setCallStatus(payload?.message || "Doctor joined room");
          if (role === "doctor" && payload?.message?.toLowerCase().includes("ready")) {
            createOffer().catch(() => {});
          }
        });

        socket.on("user-joined", (payload: { message?: string }) => {
          setCallStatus(payload?.message || "Patient joined room");
        });

        socket.on("user-ready", () => {
          setPeerConnected(true);
          setCallStatus("Patient is ready");
          if (role === "doctor") {
            createOffer().catch(() => {});
          }
        });

        socket.on("doctor-ready", () => {
          setPeerConnected(true);
          setCallStatus("Doctor is ready");
          if (role === "user") {
            socket.emit("user-ready-ack", { roomId });
          }
        });

        socket.on("user-ready-ack", () => {
          if (role === "doctor") {
            createOffer().catch(() => {});
          }
        });

        socket.on("signal", (payload: SignalPayload) => {
          handleSignal(payload).catch(() => {});
        });

        socket.on("participant-mute-state", (payload: { role: Role; isMuted: boolean }) => {
          if (payload.role !== role) {
            setPeerMuted(Boolean(payload.isMuted));
          }
        });

        socket.on("user-mute-state", (payload: { isMuted: boolean }) => {
          if (role === "doctor") setPeerMuted(Boolean(payload.isMuted));
        });

        socket.on("doctor-mute-state", (payload: { isMuted: boolean }) => {
          if (role === "user") setPeerMuted(Boolean(payload.isMuted));
        });

        socket.on("participant-camera-state", (payload: { role: Role; isVideoOff: boolean }) => {
          if (payload.role !== role) {
            setPeerVideoOff(Boolean(payload.isVideoOff));
          }
        });

        socket.on("user-camera-state", (payload: { isVideoOff: boolean }) => {
          if (role === "doctor") setPeerVideoOff(Boolean(payload.isVideoOff));
        });

        socket.on("doctor-camera-state", (payload: { isVideoOff: boolean }) => {
          if (role === "user") setPeerVideoOff(Boolean(payload.isVideoOff));
        });

        socket.on("participant-disconnected", (payload: { role: Role; graceMs?: number }) => {
          const name = payload.role === "doctor" ? "doctor" : "patient";
          const seconds = Math.round((payload.graceMs || 30000) / 1000);
          toast.warning(`The ${name} disconnected. Waiting up to ${seconds}s for reconnection...`);
          setCallStatus("Peer disconnected");
        });

        socket.on("user-disconnected", () => {
          if (role === "doctor") {
            toast.warning("Patient disconnected. Waiting for reconnection...");
            setCallStatus("Peer disconnected");
          }
        });

        socket.on("doctor-disconnected", () => {
          if (role === "user") {
            toast.warning("Doctor disconnected. Waiting for reconnection...");
            setCallStatus("Peer disconnected");
          }
        });

        socket.on("participant-reconnected", (payload: { role: Role }) => {
          const name = payload.role === "doctor" ? "Doctor" : "Patient";
          toast.success(`${name} reconnected`);
          if (role === "doctor") {
            createOffer(true).catch(() => {});
          }
        });

        socket.on("participant-left", (payload: { role: Role; permanent: boolean }) => {
          if (payload.permanent) {
            setCallStatus("Peer left permanently");
            toast.error("The other participant has left the call.");
          }
        });

        socket.on("ice-restart-needed", () => {
          if (role === "doctor") {
            createOffer(true).catch(() => {});
          }
        });

        socket.on("call-ended-by-doctor", () => {
          if (role === "user") {
            toast.info("Doctor ended the consultation.");
            cleanupConnection();
            router.replace("/patient/video/dashboard");
          }
        });

        socket.on("call-ended-confirmed", () => {
          if (role === "doctor") {
            toast.success("Call ended successfully.");
            cleanupConnection();
            router.replace("/doctor/video/dashboard");
          }
        });

        socket.on("error", (payload: { message?: string }) => {
          console.error("[video-debug] socket error event", {
            role,
            roomId,
            payload,
          });
          toast.error(payload?.message || "Video room error");
        });
      } catch {
        toast.error("Camera and microphone access is required for video consultation.");
        router.replace(`/${role === "doctor" ? "doctor" : "patient"}/video/setup/${roomId}`);
      }
    };

    run().catch(() => {});

    return () => {
      mountedRef.current = false;
      cleanupConnection();
    };
  }, [cleanupConnection, createOffer, handleSignal, role, roomId, router, setupPeerConnection]);

  const handleToggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
    socketRef.current?.emit("mute-state", { roomId, isMuted: nextMuted });
  };

  const handleToggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextVideoOff = !isVideoOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOff;
    });

    setIsVideoOff(nextVideoOff);
    socketRef.current?.emit("camera-state", { roomId, isVideoOff: nextVideoOff });
  };

  const saveNotes = async () => {
    if (role !== "doctor") return;
    setSavingNotes(true);
    try {
      await saveConsultationNotes(roomId, notes);
      toast.success("Consultation notes saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save notes.";
      toast.error(message);
    } finally {
      setSavingNotes(false);
    }
  };

  const endCallAsDoctor = async () => {
    if (role !== "doctor") return;
    setEndingCall(true);

    try {
      socketRef.current?.emit("doctor-end-call", {
        roomId,
        appointmentId,
        notes,
      });
      toast.info("Ending call...");
    } catch {
      toast.error("Unable to end call right now.");
      setEndingCall(false);
    }
  };

  const leaveRoom = () => {
    cleanupConnection();
    router.replace(dashboardPath);
  };

  const connectionPill = useMemo(() => {
    if (peerConnected) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <Wifi className="h-3.5 w-3.5" />
          Secure connection active
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <WifiOff className="h-3.5 w-3.5" />
        Waiting for peer media
      </div>
    );
  }, [peerConnected]);

  const isDoctor = role === "doctor";

  const baseShell =
    theme === "dark"
      ? "h-screen overflow-hidden bg-slate-950 text-slate-100"
      : "h-screen overflow-hidden bg-slate-100 text-slate-900";

  const navClass =
    theme === "dark"
      ? "fixed left-0 right-0 top-0 z-40 border-b border-slate-800 bg-slate-950/92 backdrop-blur"
      : "fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur";

  return (
    <div className={baseShell}>
      <div className="relative h-screen overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full bg-black object-cover" />

        <div className={navClass}>
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <span className={theme === "dark" ? "text-sm font-semibold tracking-wide text-white" : "text-sm font-semibold tracking-wide text-slate-900"}>
                TeleHealthX
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">{connectionPill}</div>
              <div
                className={
                  theme === "dark"
                    ? "hidden rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 sm:inline-flex"
                    : "hidden rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 sm:inline-flex"
                }
              >
                {callStatus}
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className={theme === "dark" ? "h-9 w-9 border-slate-700 bg-slate-900 text-slate-100" : "h-9 w-9 border-slate-300 bg-white text-slate-800"}
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className={theme === "dark" ? "h-9 w-9 border-slate-700 bg-slate-900 text-slate-100" : "h-9 w-9 border-slate-300 bg-white text-slate-800"}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className={
              theme === "dark"
                ? "fixed right-3 top-16 z-50 w-52 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl"
                : "fixed right-3 top-16 z-50 w-52 rounded-xl border border-slate-300 bg-white/95 p-2 shadow-xl"
            }
          >
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full justify-start"
              onClick={() => {
                setMobileMenuOpen(false);
                leaveRoom();
              }}
            >
              Leave room
            </Button>
            <div className={theme === "dark" ? "px-3 py-2 text-xs text-slate-300" : "px-3 py-2 text-xs text-slate-700"}>
              Room: {roomId.slice(0, 8)}...
            </div>
          </div>
        )}

        <div
          className={`absolute z-30 overflow-hidden border-2 border-white/70 bg-black shadow-2xl transition-all duration-300 ease-out ${
            showNotes && isDoctor
              ? "bottom-[calc(45vh+6.75rem)] right-4 h-28 w-28 rounded-2xl md:bottom-6 md:left-96 md:h-40 md:w-60 md:rounded-xl"
              : "bottom-24 right-4 h-28 w-28 rounded-2xl md:bottom-6 md:right-6 md:h-40 md:w-60 md:rounded-xl"
          }`}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full bg-black object-cover" />
          <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
            You ({selfName})
          </div>
        </div>

        <div className="absolute bottom-23 left-3 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white md:bottom-6 md:left-6">
          {peerName}
          {peerMuted ? " (muted)" : ""}
          {peerVideoOff ? " (camera off)" : ""}
        </div>

        <div
          className={`fixed bottom-0 z-40 border-t backdrop-blur md:bottom-4 md:rounded-2xl ${
            theme === "dark"
              ? "left-0 right-0 border-white/15 bg-black/70 md:left-4 md:right-4"
              : "left-0 right-0 border-slate-300 bg-white/90 md:left-4 md:right-4"
          } ${showNotes && isDoctor ? "md:left-96" : ""} transition-all duration-300`}
        >
          <div className="mx-auto flex h-20 w-full max-w-5xl items-center justify-center gap-2 px-3 md:h-16 md:gap-3">
            <Button onClick={handleToggleMute} variant={isMuted ? "destructive" : "secondary"} size="icon" className="h-10 w-10 rounded-full md:h-9 md:w-9" aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={handleToggleVideo} variant={isVideoOff ? "destructive" : "secondary"} size="icon" className="h-10 w-10 rounded-full md:h-9 md:w-9" aria-label={isVideoOff ? "Turn video on" : "Turn video off"}>
              {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>

            {isDoctor && (
              <Button
                type="button"
                variant={showNotes ? "default" : "secondary"}
                size="icon"
                className="h-10 w-10 rounded-full md:h-9 md:w-9"
                onClick={() => setShowNotes((prev) => !prev)}
                aria-label={showNotes ? "Hide notes" : "Show notes"}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}

            {isDoctor && (
              <Button type="button" variant="destructive" size="icon" className="h-10 w-10 rounded-full md:h-9 md:w-9" onClick={endCallAsDoctor} disabled={endingCall} aria-label="End consultation">
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}

            <div className={theme === "dark" ? "ml-2 text-xs text-slate-300" : "ml-2 text-xs text-slate-700"}>{callStatus}</div>
          </div>
        </div>

        {isDoctor && (
          <div
            className={
              theme === "dark"
                ? `fixed bottom-20 left-0 right-0 z-30 h-[45vh] rounded-t-3xl border-t border-slate-700 bg-slate-900/95 p-4 backdrop-blur transition-transform duration-300 ease-out md:bottom-0 md:top-14 md:w-88 md:rounded-none md:border-r md:border-t-0 ${showNotes ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full md:translate-y-0"}`
                : `fixed bottom-20 left-0 right-0 z-30 h-[45vh] rounded-t-3xl border-t border-slate-300 bg-white/95 p-4 backdrop-blur transition-transform duration-300 ease-out md:bottom-0 md:top-14 md:w-88 md:rounded-none md:border-r md:border-t-0 ${showNotes ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full md:translate-y-0"}`
            }
          >
            <div className="flex items-center justify-between">
              <h2 className={theme === "dark" ? "text-base font-semibold text-slate-100" : "text-base font-semibold text-slate-900"}>
                Consultation Notes
              </h2>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={theme === "dark" ? "h-8 w-8 rounded-full border-slate-700 bg-slate-800 text-slate-100" : "h-8 w-8 rounded-full border-slate-300 bg-white text-slate-800"}
                onClick={() => setShowNotes(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write diagnosis, treatment plan, and prescription guidance..."
                className={
                  theme === "dark"
                    ? "h-[30vh] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-sky-500 md:h-[calc(100vh-14.5rem)]"
                    : "h-[30vh] w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-sky-500 md:h-[calc(100vh-14.5rem)]"
                }
              />
              <Button type="button" onClick={saveNotes} disabled={savingNotes} className="h-10 w-full">
                {savingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
