/**
 * AI Interview Component - Main Interview Interface
 *
 * This is the core component that handles the AI-powered interview session.
 * It integrates with Vapi AI for voice interaction, TensorFlow.js for face detection,
 * and provides a modern, premium UI with real-time feedback and evaluation.
 *
 * Key Features:
 * - Real-time AI voice conversation using Vapi API
 * - Live webcam feed with face detection monitoring
 * - Modern premium UI with glass morphism effects
 * - Neon border animation when AI is speaking
 * - Real-time transcript capture and formatting
 * - Automatic interview evaluation using AI
 * - Performance tracking and database updates
 *
 * Technical Integrations:
 * - Vapi AI: Voice conversation and speech recognition
 * - TensorFlow.js: Face detection and monitoring
 * - Groq API: Interview evaluation and scoring
 * - Axios: HTTP requests for data persistence
 *
 * UI Components:
 * - AI Assistant panel with avatar and status indicators
 * - User webcam panel with live video feed
 * - Control panel with status and end interview button
 * - Neon border animation system for visual feedback
 *
 * State Management:
 * - vapi: Vapi AI instance for voice interaction
 * - isConnected: Connection status with Vapi
 * - isSpeaking: AI speaking status for animations
 * - transcript: Real-time conversation transcript
 * - detector: TensorFlow face detection model
 *
 * @param {string} apiKey - Vapi AI API key from environment variables
 * @param {string} assistantId - Vapi AI assistant ID for interview configuration
 * @param {string} userId - Database user ID for performance tracking
 * @param {Object} config - Vapi configuration with personalized variables
 *
 * @author AI Interview Platform Team
 * @version 1.0.0
 */

import React, { useRef, useState, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import evaluateInterview from "../evaluateMetrics";
import axios from "axios";
import Webcam from "react-webcam";
import "@mediapipe/face_detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as faceDetection from "@tensorflow-models/face-detection";
import { TensorBuffer } from "@tensorflow/tfjs-core";
import * as tf from "@tensorflow/tfjs";
import { Grid } from "ldrs/react";
import "ldrs/react/Grid.css";

const Interview = ({ apiKey, assistantId, userId, config = {} }) => {
  const [vapi, setVapi] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const webcamRef = useRef(null);
  const [detector, setDetector] = useState(null);

  // Load the model only once when component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Initialize TensorFlow.js backend
        await tf.setBackend("webgl");

        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
          runtime: "tfjs", // Changed from 'mediapipe' to 'tfjs'
          maxFaces: 1,
          modelType: "short", // Using the lighter model for better performance
        };

        const detector = await faceDetection.createDetector(
          model,
          detectorConfig,
        );
        setDetector(detector);
        console.log("Face detection model loaded successfully");
      } catch (error) {
        console.error("Error loading the face detection model:", error);
      }
    };
    loadModel();
  }, []);

  // Set up face detection interval
  useEffect(() => {
    if (!detector) return;

    const detectFaces = async () => {
      if (webcamRef.current) {
        const video = webcamRef.current.video;
        if (video && video.readyState === 4) {
          try {
            const faces = await detector.estimateFaces(video);
            if (faces.length == 0) {
              console.log("No faces detected");
              alert("Please be within the screen for the interview");
            } else {
              console.log("Detected faces:", faces);
            }
          } catch (error) {
            console.error("Error detecting faces:", error);
          }
        }
      }
    };

    const intervalId = setInterval(detectFaces, 1000);
    return () => clearInterval(intervalId);
  }, [detector]);

  // take the raw transcript and format it in the form of
  // [{
  //   role : string
  //    message : string
  //   }]
  function formatVapiTranscript(transcriptArray) {
    if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) {
      return [];
    }

    const result = [];
    let currentRole = null;
    let currentText = "";

    for (let i = 0; i < transcriptArray.length; i++) {
      const item = transcriptArray[i];

      // Skip if item doesn't have required properties
      if (!item.role || !item.text) {
        continue;
      }

      // If role changes, save the previous message and start new one
      if (item.role !== currentRole) {
        // Save previous message if it exists
        if (currentRole && currentText.trim()) {
          result.push({
            role: currentRole,
            text: currentText.trim(),
          });
        }

        // Start new message
        currentRole = item.role;
        currentText = item.text;
      } else {
        // Same role - check if this text is longer and contains the previous text
        // This handles the progressive text building in Vapi
        if (
          item.text.length > currentText.length &&
          item.text.startsWith(currentText.trim())
        ) {
          currentText = item.text;
        } else if (!currentText.includes(item.text) && item.text.trim()) {
          // If it's a completely new sentence, append it
          currentText += " " + item.text;
        }
      }
    }

    // Don't forget the last message
    if (currentRole && currentText.trim()) {
      result.push({
        role: currentRole,
        text: currentText.trim(),
      });
    }

    return result;
  }

  // convert the array of objects in the form of strings in
  // order to make llms understand for evaluation
  function formatTranscriptForLLM(transcriptArray) {
    const formattedTranscript = formatVapiTranscript(transcriptArray);

    // Convert to readable string format
    let transcriptString = "INTERVIEW TRANSCRIPT:\n\n";

    formattedTranscript.forEach((message) => {
      const speaker =
        message.role === "assistant" ? "AI INTERVIEWER" : "CANDIDATE";
      transcriptString += `${speaker}: ${message.text}\n\n`;
    });

    return transcriptString;
  }

  useEffect(() => {
    const vapiInstance = new Vapi(apiKey);
    setVapi(vapiInstance);

    // Event listeners
    vapiInstance.on("call-start", () => {
      setIsConnected(true);
    });

    vapiInstance.on("call-end", () => {
      setIsConnected(false);
      setIsSpeaking(false);
    });

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapiInstance.on("message", (message) => {
      if (message.type === "transcript") {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role,
            text: message.transcript,
          },
        ]);
      }
    });

    vapiInstance.on("error", (error) => {
      console.error("Vapi error:", error);
    });

    return () => {
      vapiInstance?.stop();
    };
  }, [apiKey]);

  const startCall = () => {
    if (vapi) {
      vapi.start(assistantId, config);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
      var formattedResult = formatVapiTranscript(transcript);
      var transcriptString = formatTranscriptForLLM(formattedResult);
      console.log(transcriptString);
      console.log(formattedResult);

      async function run(result, userId) {
        try {
          // Get evaluation from AI
          const evaluation = await evaluateInterview(result);
          console.log("Evaluation:", evaluation);

          // Update user performance in database
          if (userId) {
            const response = await axios.put(
              `http://localhost:3000/users/${userId}/performance`,
              { performanceDetails: evaluation },
              { headers: { "Content-Type": "application/json" } },
            );

            console.log("Performance updated successfully:", response.data);
          }
        } catch (error) {
          console.error("Error updating performance:", error);
        }
      }

      run(transcriptString, userId);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        background:
          "radial-gradient(1200px 800px at 70% 20%, rgba(18,165,148,0.12) 0%, transparent 70%), radial-gradient(900px 600px at 30% 80%, rgba(99,102,241,0.15) 0%, transparent 70%), linear-gradient(135deg, #0a0e1a 0%, #0f1419 50%, #1a1f2e 100%)",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {!isConnected ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at center, rgba(18,165,148,0.05) 0%, transparent 70%)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "32px",
              padding: "48px",
              borderRadius: "24px",
              background:
                "linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)",
              border: "1px solid rgba(148,163,184,0.2)",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(18,165,148,0.1)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textAlign: "center",
                lineHeight: "1.2",
              }}
            >
              Ready for your
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #12A594 0%, #22d3ee 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI Interview?
              </span>
            </div>
            <button
              onClick={startCall}
              style={{
                background: "linear-gradient(135deg, #12A594 0%, #0f766e 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "16px",
                padding: "18px 36px",
                fontSize: "18px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow:
                  "0 20px 40px rgba(18, 165, 148, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-3px) scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 25px 50px rgba(18, 165, 148, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 20px 40px rgba(18, 165, 148, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
            >
              Begin Interview
            </button>
            <div
              style={{
                fontSize: "14px",
                color: "#94a3b8",
                textAlign: "center",
                lineHeight: "1.6",
              }}
            >
              🎤 Microphone access required
              <br />
              Ensure you're in a quiet environment
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "20px",
            gap: "20px",
          }}
        >
          {/* Main content area - takes up most of the width */}
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                flex: "1",
              }}
            >
              {/* AI Assistant tile with rotating neon border lines */}
              <div
                style={{
                  position: "relative",
                  background:
                    "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%)",
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.2)",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(148,163,184,0.1)",
                  backdropFilter: "blur(20px)",
                  zIndex: 1,
                }}
              >
                {/* Rotating neon border lines when speaking */}
                {isSpeaking && (
                  <>
                    {/* Top border line */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-2px",
                        left: "0",
                        right: "0",
                        height: "4px",
                        background:
                          "linear-gradient(90deg, transparent, #00ff88, #00ffff, #00ff88, transparent)",
                        animation: "neonBorderFlow 2s linear infinite",
                        zIndex: -1,
                      }}
                    />
                    {/* Right border line */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        right: "-2px",
                        bottom: "0",
                        width: "4px",
                        background:
                          "linear-gradient(180deg, transparent, #00ff88, #00ffff, #00ff88, transparent)",
                        animation: "neonBorderFlow 2s linear infinite 0.5s",
                        zIndex: -1,
                      }}
                    />
                    {/* Bottom border line */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        left: "0",
                        right: "0",
                        height: "4px",
                        background:
                          "linear-gradient(270deg, transparent, #00ff88, #00ffff, #00ff88, transparent)",
                        animation: "neonBorderFlow 2s linear infinite 1s",
                        zIndex: -1,
                      }}
                    />
                    {/* Left border line */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "-2px",
                        bottom: "0",
                        width: "4px",
                        background:
                          "linear-gradient(0deg, transparent, #00ff88, #00ffff, #00ff88, transparent)",
                        animation: "neonBorderFlow 2s linear infinite 1.5s",
                        zIndex: -1,
                      }}
                    />
                  </>
                )}

                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    backdropFilter: "blur(8px)",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: isSpeaking
                        ? "linear-gradient(45deg, #ef4444, #f97316)"
                        : "linear-gradient(45deg, #10b981, #06d6a0)",
                      boxShadow: isSpeaking
                        ? "0 0 20px #ef4444, 0 0 40px rgba(239,68,68,0.5)"
                        : "0 0 15px #10b981",
                      animation: isSpeaking
                        ? "statusPulse 1s ease-in-out infinite"
                        : "none",
                    }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#f8fafc",
                      letterSpacing: "0.025em",
                    }}
                  >
                    AI Interviewer
                  </div>
                </div>

                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 40px 40px",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: isSpeaking ? "280px" : "260px",
                      height: isSpeaking ? "300px" : "280px",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      borderRadius: "16px",
                      background: isSpeaking
                        ? "linear-gradient(135deg, rgba(18,165,148,0.3), rgba(6,182,212,0.2))"
                        : "linear-gradient(135deg, rgba(18,165,148,0.2), rgba(99,102,241,0.15))",
                      border: isSpeaking
                        ? "2px solid rgba(18,165,148,0.6)"
                        : "1px solid rgba(148,163,184,0.3)",
                      boxShadow: isSpeaking
                        ? "0 0 40px rgba(18,165,148,0.4), inset 0 0 60px rgba(18,165,148,0.2)"
                        : "0 10px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(148,163,184,0.1)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* <img
                      src="src/components/avatarImage.png"
                      alt="AI Assistant Avatar"
                      style={{
                        width: "90%",
                        height: "90%",
                        borderRadius: "12px",
                        objectFit: "cover",
                        filter: isSpeaking
                          ? "brightness(1.1) saturate(1.2)"
                          : "brightness(1) saturate(1)",
                        transition: "filter 0.3s ease",
                      }}
                    />*/}
                    {isSpeaking ? (
                      <Grid size="60" speed="1.5" color="black" />
                    ) : (
                      <Grid size="60" speed="0" color="black" />
                    )}
                  </div>
                </div>
              </div>

              {/* User webcam tile */}
              <div
                style={{
                  position: "relative",
                  background:
                    "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%)",
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.2)",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(148,163,184,0.1)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    fontSize: "12px",
                    color: "#94a3b8",
                    fontWeight: 600,
                    zIndex: 10,
                  }}
                >
                  YOU
                </div>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>

            {/* Enhanced Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: "20px",
                padding: "20px 24px",
                boxShadow:
                  "0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(148,163,184,0.1)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: "12px",
                    background: isSpeaking
                      ? "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.2))"
                      : "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,214,160,0.2))",
                    border: isSpeaking
                      ? "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(16,185,129,0.3)",
                    color: "#f8fafc",
                    fontSize: "14px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: isSpeaking ? "#ef4444" : "#10b981",
                      animation: "statusPulse 2s ease-in-out infinite",
                    }}
                  />
                  {isSpeaking ? "AI Speaking..." : "Listening..."}
                </div>
              </div>

              <button
                onClick={endCall}
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  boxShadow:
                    "0 10px 30px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  textTransform: "uppercase",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-2px) scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 35px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 30px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
                }}
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes neonBorderFlow {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          50% {
            opacity: 1;
            transform: scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleX(0);
          }
        }

        @keyframes statusPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default Interview;
