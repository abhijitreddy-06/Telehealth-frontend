"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Camera, CameraOff, Mic, MicOff, Moon, Phone, PhoneOff, ShieldCheck, Sun, Wifi, WifiOff } from "lucide-react";
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

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function resolveSocketUrl() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (socketUrl && /^https?:\/\//.test(socketUrl)) {
    return socketUrl.replace(/\/$/, "");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//.test(apiUrl)) {
    return apiUrl.replace(/\/backend\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:10000`;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
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

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState("Connecting...");
  const [peerConnected, setPeerConnected] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(defaultNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [endingCall, setEndingCall] = useState(false);
  const [reconnectBanner, setReconnectBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const roleLabel = role === "doctor" ? "doctor" : "patient";
  const dashboardPath = role === "doctor" ? "/doctor/video/dashboard" : "/patient/video/dashboard";

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial: "light" | "dark" =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
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
        setReconnectBanner(null);
        setCallStatus("Connected");
      }

      if (state === "disconnected") {
        setCallStatus("Connection interrupted...");
      }

      if (state === "failed" && role === "doctor") {
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

        const socket = io(resolveSocketUrl(), {
          transports: ["websocket", "polling"],
          withCredentials: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", { roomId, role });
          setCallStatus("Joined secure room");
        });

        socket.on("connect_error", () => {
          setReconnectBanner("Unable to reach signaling server. Retrying...");
          setCallStatus("Reconnecting...");
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
          setReconnectBanner(`The ${name} disconnected. Waiting up to ${seconds}s for reconnection...`);
          setCallStatus("Peer disconnected");
        });

        socket.on("user-disconnected", () => {
          if (role === "doctor") {
            setReconnectBanner("The patient disconnected. Waiting for reconnection...");
            setCallStatus("Peer disconnected");
          }
        });

        socket.on("doctor-disconnected", () => {
          if (role === "user") {
            setReconnectBanner("The doctor disconnected. Waiting for reconnection...");
            setCallStatus("Peer disconnected");
          }
        });

        socket.on("participant-reconnected", (payload: { role: Role }) => {
          const name = payload.role === "doctor" ? "Doctor" : "Patient";
          setReconnectBanner(`${name} reconnected`);
          setTimeout(() => {
            if (mountedRef.current) setReconnectBanner(null);
          }, 1500);
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

  const baseShell =
    theme === "dark"
      ? "min-h-screen bg-slate-950 text-slate-100"
      : "min-h-screen bg-slate-100 text-slate-900";

  const topBarClass =
    theme === "dark"
      ? "absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-2 backdrop-blur"
      : "absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white/85 p-2 backdrop-blur";

  if (role === "user") {
    return (
      <div className={baseShell}>
        <div className="relative min-h-screen overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-screen w-full bg-black object-cover" />

          <div className={topBarClass}>
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className={theme === "dark" ? "text-xs text-slate-200" : "text-xs text-slate-700"}>
                Patient room {roomId.slice(0, 8)}...
              </span>
              {connectionPill}
            </div>

            <div className="flex items-center gap-2">
              <div
                className={
                  theme === "dark"
                    ? "inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                    : "inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700"
                }
              >
                {callStatus}
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={
                  theme === "dark"
                    ? "h-9 w-9 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                    : "h-9 w-9 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {reconnectBanner && (
            <div
              className={
                theme === "dark"
                  ? "absolute left-3 right-3 top-20 z-20 rounded-xl border border-sky-700 bg-sky-900/50 px-3 py-2 text-xs text-sky-200"
                  : "absolute left-3 right-3 top-20 z-20 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800"
              }
            >
              {reconnectBanner}
            </div>
          )}

          <div className="absolute bottom-24 right-4 z-20 w-40 overflow-hidden rounded-xl border-2 border-white/70 bg-black shadow-2xl sm:w-52">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-30 w-full bg-black object-cover sm:h-36" />
            <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
              You ({selfName})
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 px-3">
            <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/60 p-2 backdrop-blur">
              <Button onClick={handleToggleMute} variant={isMuted ? "destructive" : "secondary"} className="h-10 min-w-23">
                {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button onClick={handleToggleVideo} variant={isVideoOff ? "destructive" : "secondary"} className="h-10 min-w-26.5">
                {isVideoOff ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                {isVideoOff ? "Video On" : "Video Off"}
              </Button>
              <Button type="button" variant="destructive" className="h-10 min-w-26" onClick={leaveRoom}>
                <PhoneOff className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            Dr. {peerName}
            {peerMuted ? " (muted)" : ""}
            {peerVideoOff ? " (camera off)" : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={baseShell}>
      <div className="relative min-h-screen overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-screen w-full bg-black object-cover" />

        <div className={topBarClass}>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className={theme === "dark" ? "text-xs text-slate-200" : "text-xs text-slate-700"}>
              Doctor room {roomId.slice(0, 8)}...
            </span>
            {connectionPill}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={
                theme === "dark"
                  ? "h-9 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  : "h-9 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
              }
              onClick={() => setShowNotes((prev) => !prev)}
            >
              <Phone className="mr-2 h-4 w-4" />
              {showNotes ? "Hide Notes" : "Show Notes"}
            </Button>

            <div
              className={
                theme === "dark"
                  ? "inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                  : "inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700"
              }
            >
              {callStatus}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={
                theme === "dark"
                  ? "h-9 w-9 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  : "h-9 w-9 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
              }
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {reconnectBanner && (
          <div
            className={
              theme === "dark"
                ? "absolute left-3 right-3 top-20 z-20 rounded-xl border border-sky-700 bg-sky-900/50 px-3 py-2 text-xs text-sky-200"
                : "absolute left-3 right-3 top-20 z-20 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800"
            }
          >
            {reconnectBanner}
          </div>
        )}

        <div className="absolute bottom-24 right-4 z-20 w-40 overflow-hidden rounded-xl border-2 border-white/70 bg-black shadow-2xl sm:w-52">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-30 w-full bg-black object-cover sm:h-36" />
          <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
            You ({selfName})
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
          {peerName}
          {peerMuted ? " (muted)" : ""}
          {peerVideoOff ? " (camera off)" : ""}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 px-3">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/60 p-2 backdrop-blur">
            <Button onClick={handleToggleMute} variant={isMuted ? "destructive" : "secondary"} className="h-10 min-w-23">
              {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button onClick={handleToggleVideo} variant={isVideoOff ? "destructive" : "secondary"} className="h-10 min-w-26.5">
              {isVideoOff ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
              {isVideoOff ? "Video On" : "Video Off"}
            </Button>
            <Button type="button" variant="destructive" className="h-10 min-w-26" onClick={endCallAsDoctor} disabled={endingCall}>
              <PhoneOff className="mr-2 h-4 w-4" />
              {endingCall ? "Ending..." : "End"}
            </Button>
          </div>
        </div>

        <div
          className={
            theme === "dark"
              ? `absolute bottom-0 right-0 top-0 z-30 w-full max-w-md border-l border-slate-700 bg-slate-900/95 p-4 backdrop-blur transition-transform duration-300 ease-out ${showNotes ? "translate-x-0" : "translate-x-full"}`
              : `absolute bottom-0 right-0 top-0 z-30 w-full max-w-md border-l border-slate-300 bg-white/95 p-4 backdrop-blur transition-transform duration-300 ease-out ${showNotes ? "translate-x-0" : "translate-x-full"}`
          }
        >
          <div className="flex items-center justify-between">
            <h2 className={theme === "dark" ? "text-base font-semibold text-slate-100" : "text-base font-semibold text-slate-900"}>
              Consultation Notes
            </h2>
            <Button
              type="button"
              variant="outline"
              className={theme === "dark" ? "h-9 border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" : "h-9 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"}
              onClick={() => setShowNotes(false)}
            >
              Close
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write diagnosis, treatment plan, and prescription guidance..."
              className={
                theme === "dark"
                  ? "h-[72vh] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-sky-500"
                  : "h-[72vh] w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-sky-500"
              }
            />
            <Button type="button" onClick={saveNotes} disabled={savingNotes} className="h-10 w-full">
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
