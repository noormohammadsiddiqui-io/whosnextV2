'use client';
import { useEffect, useRef, useState } from 'react';
import socket, { subscribeToOnlineUsersCount } from '../../../lib/socket';
import Link from 'next/link';

// For debugging
console.log('Socket instance:', socket);

export default function VideoChat() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sendersRef = useRef<RTCRtpSender[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [status, setStatus] = useState('Waiting for partner...');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [partnerAudioMuted, setPartnerAudioMuted] = useState(false);
  const [partnerVideoMuted, setPartnerVideoMuted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Function to directly set up video with a stream
  const setupVideoElement = (videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream, label: string) => {
    if (!videoRef.current) {
      console.log(`${label} video ref is null`);
      return;
    }
    
    console.log(`Setting up ${label} video element with stream:`, stream.id);
    console.log(`Stream has ${stream.getTracks().length} tracks:`, 
      stream.getTracks().map(track => `${track.kind}:${track.id} (${track.readyState}, enabled=${track.enabled}, muted=${track.muted})`))
    
    // Check if tracks are enabled and enable them if not
    stream.getTracks().forEach(track => {
      if (!track.enabled) {
        console.log(`Enabling disabled ${track.kind} track`);
        track.enabled = true;
      }
      
      // Add event listener for track ended
      track.onended = () => {
        console.log(`${label} ${track.kind} track ended`);
        // Log the current state of all tracks when one ends
        console.log(`Current ${label} stream tracks after one ended:`, 
          stream.getTracks().map(t => `${t.kind}:${t.id} (${t.readyState}, enabled=${t.enabled}, muted=${t.muted})`));
      };
      
      // Add event listener for track mute/unmute
      track.onmute = () => {
        console.log(`${label} ${track.kind} track muted`);
        // Try to unmute if it gets muted
        setTimeout(() => {
          if (track.muted && !track.enabled) {
            console.log(`Attempting to enable muted ${label} ${track.kind} track`);
            track.enabled = true;
          }
        }, 1000);
      };
      
      track.onunmute = () => {
        console.log(`${label} ${track.kind} track unmuted`);
      };
    });
    
    // Set the stream as the source
    videoRef.current.srcObject = stream;
    
    // Force play when metadata is loaded
    videoRef.current.onloadedmetadata = () => {
      console.log(`${label} video metadata loaded, playing video`);
      console.log(`${label} video element properties before play:`, {
        width: videoRef.current?.videoWidth,
        height: videoRef.current?.videoHeight,
        paused: videoRef.current?.paused,
        muted: videoRef.current?.muted,
        volume: videoRef.current?.volume,
        readyState: videoRef.current?.readyState
      });
      
      const playPromise = videoRef.current?.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
                  // Handle AbortError specifically
                  if (e.name === 'AbortError') {
                    console.log(`${label} video play was interrupted by new load request - this is expected behavior`);
                    return; // Don't treat this as an error
                  }
                  
                  console.error(`Error playing ${label} video: ${e.message}`);
                  // Try again after a short delay
                  setTimeout(() => {
                    if (videoRef.current) {
                      // Ensure the stream is still set
                      if (!videoRef.current.srcObject) {
                        console.log(`Re-applying stream to ${label} video element`);
                        videoRef.current.srcObject = stream;
                      }
                      
                      // Check if tracks are enabled again
                      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                      console.log(`Re-checking ${label} tracks:`, 
                        tracks.map(t => `${t.kind}:${t.id} (${t.readyState}, enabled=${t.enabled}, muted=${t.muted})`));
                      
                      tracks.forEach(track => {
                        if (!track.enabled) {
                          console.log(`Re-enabling disabled ${track.kind} track`);
                          track.enabled = true;
                        }
                      });
                      
                      videoRef.current.play().catch(e => {
                        if (e.name === 'AbortError') {
                          console.log(`${label} video retry was interrupted - this is expected behavior`);
                          return;
                        }
                        
                        console.error(`${label} video playback retry failed: ${e.message}`);
                        // Try one more time with a user interaction simulation
                        setTimeout(() => {
                          if (videoRef.current) {
                            console.log(`Final attempt to play ${label} video`);
                            // Temporarily mute to help autoplay
                            const wasMuted = videoRef.current.muted;
                            videoRef.current.muted = true;
                            videoRef.current.play().then(() => {
                              if (label !== 'Local' && !wasMuted) { // Don't unmute local video or if it was already muted
                                console.log(`Unmuting ${label} video after successful play`);
                                setTimeout(() => {
                                  if (videoRef.current) videoRef.current.muted = false;
                                }, 1000);
                              }
                            }).catch(e => {
                              if (e.name !== 'AbortError') {
                                console.error(`Final ${label} video playback attempt failed: ${e.message}`);
                              }
                            });
                          }
                        }, 2000);
                      });
                    }
                  }, 1000);
                });
      }
    };
    
    // Add event listeners to track video element state
    videoRef.current.onplay = () => {
      console.log(`${label} video started playing`);
      console.log(`${label} video element properties after play:`, {
        width: videoRef.current?.videoWidth,
        height: videoRef.current?.videoHeight,
        paused: videoRef.current?.paused,
        muted: videoRef.current?.muted,
        volume: videoRef.current?.volume,
        readyState: videoRef.current?.readyState
      });
    };
    
    videoRef.current.onpause = () => {
      console.log(`${label} video paused`);
      // Try to resume playback if it's not a user-initiated pause
      if (videoRef.current && videoRef.current.srcObject) {
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            console.log(`Attempting to resume ${label} video after pause`);
            videoRef.current.play().catch(e => {
              console.error(`Failed to resume ${label} video after pause: ${e.message}`);
              // Try with muting as a fallback
              if (videoRef.current && !videoRef.current.muted) {
                console.log(`Trying to play muted ${label} video after pause`);
                videoRef.current.muted = true;
                videoRef.current.play().then(() => {
                  // Unmute after successful play
                  setTimeout(() => {
                    if (videoRef.current) {
                      console.log(`Unmuting ${label} video after successful play from pause`);
                      videoRef.current.muted = false;
                    }
                  }, 1000);
                }).catch(e => {
                  console.error(`Failed to play ${label} video even when muted after pause:`, e.message);
                });
              }
            });
          }
        }, 1000);
      }
    };
    
    videoRef.current.onended = () => console.log(`${label} video ended`);
    videoRef.current.onerror = (e) => console.error(`${label} video error:`, videoRef.current?.error);
    
    // Add a visibility change listener to handle tab switching
    const visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible' && videoRef.current) {
        console.log(`Document became visible, checking ${label} video playback`);
        
        // Add a small delay to avoid interrupting any ongoing load requests
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused && videoRef.current.srcObject) {
            // Check if the video element is ready for playback
            if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
              console.log(`${label} video was paused and ready, attempting to resume playback`);
              
              // Create a new play promise to avoid interrupting previous ones
              const playPromise = videoRef.current.play();
              
              if (playPromise !== undefined) {
                playPromise.catch(e => {
                  // Only log if it's not an AbortError (which happens when interrupted)
                  if (e.name !== 'AbortError') {
                    console.error(`Error resuming ${label} video after visibility change: ${e.message}`);
                    
                    // Try with muted playback as fallback
                    if (videoRef.current && !videoRef.current.muted) {
                      console.log(`Trying muted playback for ${label} video after visibility change`);
                      videoRef.current.muted = true;
                      videoRef.current.play().then(() => {
                        // Unmute after successful play
                        setTimeout(() => {
                          if (videoRef.current) {
                            videoRef.current.muted = false;
                          }
                        }, 1000);
                      }).catch(mutedError => {
                        if (mutedError.name !== 'AbortError') {
                          console.error(`Failed to play muted ${label} video:`, mutedError.message);
                        }
                      });
                    }
                  } else {
                    console.log(`${label} video play was aborted (likely due to new load request)`);
                  }
                });
              }
            } else {
              console.log(`${label} video not ready for playback (readyState: ${videoRef.current.readyState})`);
            }
          }
        }, 500); // 500ms delay to avoid interrupting load requests
      }
    };
    
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    // Return a cleanup function to remove the event listener
    return () => {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    };
  };



  // Subscribe to online users count
  useEffect(() => {
    const unsubscribe = subscribeToOnlineUsersCount((count) => {
      setOnlineUsers(count);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Your browser does not support video chat');
      return;
    }

    // Try to get camera access when component mounts
    requestCameraAccess()
      .then(stream => {
        console.log('Camera access granted, setting up local video');
        setupVideoElement(localVideoRef, stream, 'Local');
      })
      .catch(() => {
        console.log('Initial camera access request failed');
      });

    // Debug socket connection status
    console.log('Socket instance details:', socket);
    console.log('Initial socket connected status:', socket.connected);

    socket.on('connect', () => {
      console.log('Connected with ID:', socket.id);
      console.log('Socket connected status after connect:', socket.connected);
      console.log('Socket transport:', socket.io.engine.transport.name);
      console.log('Socket readyState:', socket.io.engine.readyState);
      setStatus(`Connected (${socket.id?.substring(0, 6) || 'unknown'})`);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Socket connection error details:', error.message);
      setStatus(`Connection error: ${error.message}`);
    });
    
    socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
      console.error('Socket status after timeout:', socket.connected);
      setStatus('Connection timeout');
    });

    socket.on('partner', async (data) => {
      console.log('Received partner event with data:', data);
      console.log('Partner event data type:', typeof data);
      console.log('Partner event data structure:', JSON.stringify(data, null, 2));
      
      // Handle both old format (string) and new format (object)
      let partnerId: string;
      let isCaller: boolean;
      
      if (typeof data === 'string') {
        // Old format - assume first user is caller
        partnerId = data;
        isCaller = true;
        console.log('Using legacy partner format, assuming caller role');
      } else {
        // New format with explicit roles
        partnerId = data.partnerId;
        isCaller = data.isCaller;
        console.log(`Partner role: ${isCaller ? 'caller' : 'receiver'}`);
      }
      
      console.log(`Setting partner ID: ${partnerId}, role: ${isCaller ? 'caller' : 'receiver'}`);
      setPartnerId(partnerId);
      setStatus(`Connected with partner: ${partnerId.substring(0, 6)} (${isCaller ? 'initiating' : 'waiting for'} connection)`);
      
      // Start WebRTC with the correct role
      console.log(`Starting WebRTC as ${isCaller ? 'caller' : 'receiver'} with partner ${partnerId}`);
      await startWebRTC(isCaller, partnerId);
    });

    socket.on('partner_disconnected', ({ disconnectedPartnerId }) => {
      console.log('Partner disconnected:', disconnectedPartnerId);
      setStatus('Partner disconnected. Looking for new partner...');
      
      // Clean up current WebRTC connection
      if (pcRef.current) {
        console.log('Closing RTCPeerConnection due to partner disconnect');
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      
      // Clear remote video
      if (remoteVideoRef.current?.srcObject) {
        console.log('Clearing remote video source due to partner disconnect');
        remoteVideoRef.current.srcObject = null;
      }
      
      // Reset partner ID
      setPartnerId('');
      
      // The server will automatically try to pair this user with another available user
      console.log('Waiting for automatic reconnection to new partner...');
    });

    socket.on('signal', async ({ from, signal }) => {
      console.log('Received signal from:', from, 'signal type:', signal.type || 'candidate');
      
      // Initialize PeerConnection if it doesn't exist yet
      if (!pcRef.current) {
        console.log('Initializing PeerConnection for incoming signal');
        await startWebRTC(false, from);
      }
      
      const pc = pcRef.current;
      if (!pc) {
        console.error('PeerConnection still not initialized when receiving signal');
        return;
      }

      try {
        if (signal.type === 'offer') {
          console.log('Processing offer signal');
          // Ensure we're in a state to receive an offer
          if (pc.signalingState !== 'stable') {
            console.warn(`Unexpected offer received in signaling state: ${pc.signalingState}`);
            // If we're not in a stable state, we might need to rollback
            if (pc.signalingState === 'have-local-offer') {
              console.log('Rolling back local offer to process remote offer');
              await pc.setLocalDescription({type: 'rollback'});
            }
          }
          
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log('Remote description set successfully for offer');
          
          const answer = await pc.createAnswer();
          console.log('Created answer:', answer);
          
          await pc.setLocalDescription(answer);
          console.log('Local description set successfully for answer');
          
          socket.emit('signal', { to: from, signal: answer });
          console.log('Sent answer signal to:', from);
        } else if (signal.type === 'answer') {
          console.log('Processing answer signal');
          // Only process answer if we have a local offer
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            console.log('Remote description set successfully for answer');
          } else {
            console.warn(`Unexpected answer received in signaling state: ${pc.signalingState}`);
          }
        } else if (signal.candidate) {
          console.log('Processing ICE candidate:', signal.candidate);
          // Only add ICE candidates after remote description is set
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            console.log('ICE candidate added successfully');
          } else {
            console.warn('Received ICE candidate before remote description, buffering not implemented');
          }
        } else if (signal.type === 'audio_state') {
          console.log('Received audio state signal:', signal.muted);
          // Update UI to show partner's audio state
          setPartnerAudioMuted(signal.muted);
        } else if (signal.type === 'video_state') {
          console.log('Received video state signal:', signal.muted);
          // Update UI to show partner's video state
          setPartnerVideoMuted(signal.muted);
        }
      } catch (error: unknown) {
        console.error('Error processing signal:', error);
        // Properly handle the unknown error type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setStatus(`WebRTC error: ${errorMessage}. Please refresh the page.`);
      }
    });

    return () => {
      console.log('Cleaning up socket and WebRTC resources');
      
      // Clean up socket event listeners
      socket.off('connect');
      socket.off('connect_error');
      socket.off('connect_timeout');
      socket.off('error');
      socket.off('partner');
      socket.off('partner_disconnected');
      socket.off('signal');
      
      // Disconnect socket
      socket.disconnect();

      // Close peer connection if it exists
      if (pcRef.current) {
        console.log('Closing RTCPeerConnection');
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }

      // Stop all tracks in local video stream
      if (localVideoRef.current?.srcObject) {
        console.log('Stopping local video tracks');
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        });
        localVideoRef.current.srcObject = null;
      }
      
      // Clear remote video
      if (remoteVideoRef.current?.srcObject) {
        console.log('Clearing remote video source');
        remoteVideoRef.current.srcObject = null;
      }
      
      // Reset state
      setPartnerId('');
      setStatus('Disconnected');
    };
  }, []);

  const requestCameraAccess = async () => {
    try {
      setCameraPermission('pending');
      
      // Request with specific constraints
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraPermission('granted');
      return stream;
    } catch (error: unknown) {
      // Properly handle the unknown error type
      const errorName = error instanceof Error ? error.name : 'Unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`getUserMedia error: ${errorName}: ${errorMessage}`);
      setStatus(`Camera error: ${errorMessage}`);
      setCameraPermission('denied');
      throw error;
    }
  };

  async function startWebRTC(isCaller: boolean, remoteId: string) {
    try {
      console.log(`Starting WebRTC as ${isCaller ? 'caller' : 'receiver'} with remote ID: ${remoteId}`);
      
      // Get camera access and set up local video
      const stream = await requestCameraAccess();
      localStreamRef.current = stream; // Store the stream for mute functionality
      console.log('Camera access granted, setting up local video');
      setupVideoElement(localVideoRef, stream, 'Local');

      // Create and configure the RTCPeerConnection with more STUN/TURN servers for better connectivity
      const rtcConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Add more STUN servers for better connectivity
          { urls: 'stun:openrelay.metered.ca:80' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          // Free TURN server for testing
          { 
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          { 
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
          // Note: In a production app, you would add more TURN servers here
          // { urls: 'turn:your-turn-server.com', username: 'username', credential: 'credential' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        rtcpMuxPolicy: 'require',
        bundlePolicy: 'max-bundle'
      } as RTCConfiguration;
      
      console.log('Creating RTCPeerConnection with config:', JSON.stringify(rtcConfig, null, 2));
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;
      
      // Log connection creation
      console.log('RTCPeerConnection created with configuration:', pc.getConfiguration());

      // Add all local tracks to the peer connection
      const senders = stream.getTracks().map(track => {
        console.log(`Adding ${track.kind} track to peer connection`);
        // Ensure track is enabled
        if (!track.enabled) {
          console.log(`Enabling disabled ${track.kind} track before adding to peer connection`);
          track.enabled = true;
        }
        return pc.addTrack(track, stream);
      });
      
      // Store senders for potential track replacement later
      sendersRef.current = senders;

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log('Remote track received:', event.streams);
        if (event.streams && event.streams[0]) {
          console.log('Setting up remote video with received stream:', event.streams[0].id);
          
          // Log detailed information about each track
          const tracks = event.streams[0].getTracks();
          console.log(`Remote stream has ${tracks.length} tracks:`);
          tracks.forEach(track => {
            const settings = track.kind === 'video' ? JSON.stringify(track.getSettings(), null, 2) : 'N/A';
            console.log(`Track ${track.id}: kind=${track.kind}, readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}, settings=${settings}`);
            // Ensure all tracks are enabled
            if (!track.enabled) {
              console.log(`Enabling disabled ${track.kind} track`);
              track.enabled = true;
            }
            
            // Add listeners to track state changes
            track.onended = () => {
              console.log(`Remote ${track.kind} track ended`);
              // Try to restart ICE if a track ends unexpectedly
              if (pcRef.current && pcRef.current.restartIce) {
                console.log('Attempting to restart ICE after track ended');
                pcRef.current.restartIce();
              }
            };
            
            track.onmute = () => {
              console.log(`Remote ${track.kind} track muted`);
              // Try to unmute if it gets muted
              setTimeout(() => {
                if (track.muted && !track.enabled) {
                  console.log(`Attempting to enable muted ${track.kind} track`);
                  track.enabled = true;
                }
              }, 1000);
            };
            
            track.onunmute = () => {
              console.log(`Remote ${track.kind} track unmuted`);
              console.log(`Track ${track.id} unmuted: readyState=${track.readyState}, enabled=${track.enabled}`);
            };
          });
          
          // Ensure we're setting the remote video element with the stream
          setupVideoElement(remoteVideoRef, event.streams[0], 'Remote');
          
          // Add a listener to handle when tracks are added to the stream
          event.streams[0].onaddtrack = (trackEvent) => {
            const settings = trackEvent.track.kind === 'video' ? JSON.stringify(trackEvent.track.getSettings(), null, 2) : 'N/A';
            console.log(`New ${trackEvent.track.kind} track added to remote stream`);
            console.log(`New track details: id=${trackEvent.track.id}, readyState=${trackEvent.track.readyState}, enabled=${trackEvent.track.enabled}, muted=${trackEvent.track.muted}, settings=${settings}`);
            
            // Make sure the new track is enabled
            if (!trackEvent.track.enabled) {
              console.log(`Enabling newly added ${trackEvent.track.kind} track`);
              trackEvent.track.enabled = true;
            }
            
            // Add event listeners to the new track
            trackEvent.track.onended = () => {
              console.log(`New track ${trackEvent.track.id} ended`);
              // Try to restart ICE if a track ends unexpectedly
              if (pcRef.current && pcRef.current.restartIce) {
                console.log('Attempting to restart ICE after new track ended');
                pcRef.current.restartIce();
              }
            };
            
            // Re-apply the stream to ensure the video element updates
            if (remoteVideoRef.current) {
              console.log('Re-applying remote stream after new track added');
              remoteVideoRef.current.srcObject = event.streams[0];
              
              // Force play the video
              remoteVideoRef.current.play().catch(e => {
                console.error('Error playing remote video after track added:', e.message);
                // Try again with muting as a fallback
                if (remoteVideoRef.current && !remoteVideoRef.current.muted) {
                  console.log('Temporarily muting remote video to help with playback');
                  remoteVideoRef.current.muted = true;
                  remoteVideoRef.current.play().then(() => {
                    // Unmute after successful play
                    setTimeout(() => {
                      if (remoteVideoRef.current) {
                        console.log('Unmuting remote video after successful playback');
                        remoteVideoRef.current.muted = false;
                      }
                    }, 1000);
                  }).catch(e => {
                    console.error('Failed to play remote video even when muted:', e.message);
                  });
                }
              });
            }
          };
        } else {
          console.error('No remote stream available in track event');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to remote peer');
          socket.emit('signal', { 
            to: remoteId, 
            signal: { candidate: event.candidate } 
          });
        }
      };
      
      // Log connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed to:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn('ICE connection failed or disconnected, attempting to restart ICE');
          // Try to restart ICE if it fails
          if (pc.restartIce) {
            pc.restartIce();
            console.log('ICE restart initiated');
            
            // If we have a remote stream with no video tracks or black video, try to fix it
            setTimeout(() => {
              if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
                checkAndFixRemoteVideo();
              }
            }, 2000);
          }
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed to:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('WebRTC peers connected successfully!');
          setStatus(`Connected with partner: ${remoteId.substring(0, 6)} (WebRTC established)`);
          
          // Check remote video after a short delay to ensure tracks are properly set up
          setTimeout(() => {
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
              const videoTracks = (remoteVideoRef.current.srcObject as MediaStream).getVideoTracks();
              console.log(`After connection established: Remote stream has ${videoTracks.length} video tracks`);
              if (videoTracks.length > 0) {
                console.log('Video track settings:', JSON.stringify(videoTracks[0].getSettings(), null, 2));
              }
            }
          }, 1000);
          
        } else if (pc.connectionState === 'failed') {
          console.warn('WebRTC connection failed - initiating graceful recovery');
          setStatus('Connection failed, looking for new partner...');
          
          // Instead of complex recovery, trigger partner disconnection flow
          // This will clean up the current connection and look for a new partner
          try {
            // Clean up current WebRTC connection
            if (pcRef.current) {
              console.log('Cleaning up failed WebRTC connection');
              pcRef.current.ontrack = null;
              pcRef.current.onicecandidate = null;
              pcRef.current.oniceconnectionstatechange = null;
              pcRef.current.onconnectionstatechange = null;
              pcRef.current.close();
              pcRef.current = null;
            }
            
            // Clear remote video
            if (remoteVideoRef.current?.srcObject) {
              console.log('Clearing remote video source due to connection failure');
              remoteVideoRef.current.srcObject = null;
            }
            
            // Reset partner ID to trigger search for new partner
            setPartnerId('');
            setStatus('Connection failed. Looking for new partner...');
            
            // The server's automatic pairing will handle finding a new partner
            console.log('Connection failure handled - waiting for new partner assignment');
            
          } catch (cleanupError) {
            console.error('Error during connection failure cleanup:', cleanupError);
            setStatus('Connection error. Please refresh the page.');
          }
          
        } else if (pc.connectionState === 'disconnected') {
          console.log('WebRTC connection disconnected - attempting reconnection');
          setStatus('Connection lost, attempting to reconnect...');
          
          // Try ICE restart for disconnected state
          setTimeout(() => {
            if (pc.connectionState === 'disconnected' && pc.restartIce) {
              console.log('Attempting ICE restart for disconnected connection');
              pc.restartIce();
            }
          }, 2000);
          
        } else if (pc.connectionState === 'closed') {
          console.log('WebRTC connection closed');
          setStatus('Partner disconnected. Waiting for new partner...');
        }
      };
      
      // Monitor ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state changed to:', pc.iceGatheringState);
      };
      
      // Monitor signaling state
      pc.onsignalingstatechange = () => {
        console.log('Signaling state changed to:', pc.signalingState);
      };

      // Only the caller creates and sends the offer
      if (isCaller) {
        console.log('Creating and sending offer as caller');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { to: remoteId, signal: offer });
      }
      
      // Send initial mute states to the partner
      console.log('Sending initial mute states to partner');
      socket.emit('signal', { 
        to: remoteId, 
        signal: { 
          type: 'audio_state', 
          muted: isMicMuted 
        } 
      });
      socket.emit('signal', { 
        to: remoteId, 
        signal: { 
          type: 'video_state', 
          muted: isCameraMuted 
        } 
      });
      
      return pc;
    } catch (error: unknown) {
      console.error('Error starting WebRTC:', error);
      // Properly handle the unknown error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Error starting video chat: ${errorMessage}`);
      return null;
    }
  }



  // Function to check and fix remote video if it's black
  const checkAndFixRemoteVideo = () => {
    if (!remoteVideoRef.current || !remoteVideoRef.current.srcObject) {
      console.log('Cannot check remote video: no video element or source');
      setStatus('No video connection established yet');
      return;
    }
    
    console.log('Checking remote video status...');
    const stream = remoteVideoRef.current.srcObject as MediaStream;
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log(`Remote stream has ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);
    console.log(`Video element properties: width=${remoteVideoRef.current.videoWidth}, height=${remoteVideoRef.current.videoHeight}`);
    
    if (videoTracks.length === 0) {
      console.error('Remote stream has no video tracks!');
      setStatus('Video connection issue: No video tracks received');
      
      // Try to restart ICE to renegotiate connection
      if (pcRef.current && pcRef.current.restartIce) {
        console.log('Attempting to restart ICE to get video tracks');
        pcRef.current.restartIce();
      }
      return;
    }
    
    // Log detailed track information
    console.log('Remote video tracks:', videoTracks.map(t => {
      const settings = t.getSettings();
      return `${t.id} (readyState: ${t.readyState}, enabled: ${t.enabled}, muted: ${t.muted}, settings: ${JSON.stringify(settings)})`;
    }));
    
    console.log('Remote audio tracks:', audioTracks.map(t => {
      return `${t.id} (readyState: ${t.readyState}, enabled: ${t.enabled}, muted: ${t.muted})`;
    }));
    
    // Check if tracks are enabled and in live state
    let tracksFixed = false;
    
    videoTracks.forEach(track => {
      if (!track.enabled) {
        console.log('Found disabled video track, enabling it');
        track.enabled = true;
        tracksFixed = true;
      }
      
      if (track.readyState !== 'live') {
        console.warn(`Video track is in ${track.readyState} state instead of 'live'`);
      }
      
      // Add event listeners to track state changes if not already added
      if (!track.onended) {
        track.onended = () => {
          console.log(`Remote video track ended: ${track.id}`);
          // Try to restart the connection if a track ends unexpectedly
          if (pcRef.current && pcRef.current.restartIce) {
            console.log('Attempting to restart ICE after track ended');
            pcRef.current.restartIce();
          }
        };
      }
      
      if (!track.onmute) {
        track.onmute = () => {
          console.log(`Remote video track muted: ${track.id}`);
          // Try to unmute if it gets muted
          setTimeout(() => {
            if (track.muted && !track.enabled) {
              console.log(`Attempting to enable muted video track: ${track.id}`);
              track.enabled = true;
            }
          }, 1000);
        };
      }
    });
    
    audioTracks.forEach(track => {
      if (!track.enabled) {
        console.log('Found disabled audio track, enabling it');
        track.enabled = true;
        tracksFixed = true;
      }
    });
    
    // Check video element properties
    console.log('Video element properties:', {
      width: remoteVideoRef.current.videoWidth,
      height: remoteVideoRef.current.videoHeight,
      paused: remoteVideoRef.current.paused,
      muted: remoteVideoRef.current.muted,
      volume: remoteVideoRef.current.volume,
      readyState: remoteVideoRef.current.readyState,
      networkState: remoteVideoRef.current.networkState,
      error: remoteVideoRef.current.error ? remoteVideoRef.current.error.code : 'none'
    });
    
    // Force play the video with proper interruption handling
    if (remoteVideoRef.current.paused) {
      console.log('Remote video is paused, attempting to play');
      
      // Create a new play promise to avoid interrupting previous ones
      const playPromise = remoteVideoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // Handle AbortError specifically - this is expected when interrupted
          if (e.name === 'AbortError') {
            console.log('Remote video play was interrupted by new load request - this is expected behavior');
            return; // Don't treat this as an error
          }
          
          console.error('Failed to play remote video:', e.message);
          // Try with muting as a fallback only for non-AbortError cases
          console.log('Trying to play muted video as fallback');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            const mutedPlayPromise = remoteVideoRef.current.play();
            
            if (mutedPlayPromise !== undefined) {
              mutedPlayPromise.then(() => {
                console.log('Successfully played muted video, will unmute shortly');
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.muted = false;
                    console.log('Unmuted video after successful playback');
                  }
                }, 2000);
              }).catch(mutedError => {
                if (mutedError.name !== 'AbortError') {
                  console.error('Failed to play remote video even when muted:', mutedError.message);
                }
              });
            }
          }
        });
      }
      tracksFixed = true;
    }

    // Try re-applying the stream with proper promise handling
    console.log('Re-applying remote stream to video element');
    remoteVideoRef.current.srcObject = null;
    setTimeout(() => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        
        // Wait for metadata to load before attempting to play
        const handleLoadedMetadata = () => {
          if (remoteVideoRef.current) {
            const reapplyPlayPromise = remoteVideoRef.current.play();
            
            if (reapplyPlayPromise !== undefined) {
              reapplyPlayPromise.catch(e => {
                if (e.name !== 'AbortError') {
                  console.error('Failed to play video after re-applying stream:', e.message);
                }
              });
            }
            
            // Remove the event listener after use
            remoteVideoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
        };
        
        remoteVideoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      }
    }, 100);
    
    if (tracksFixed) {
      setStatus('Video fixed. If still black, try refreshing the page.');
    } else {
      setStatus('Video checked. No issues found with tracks.');
    }
    
    // Reset status message after a few seconds
    setTimeout(() => {
      if (partnerId) {
        setStatus(`Connected with partner: ${partnerId.substring(0, 6)} (WebRTC established)`);
      }
    }, 5000);
  };

  // Mute/unmute microphone
  const toggleMicrophone = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    
    try {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('No audio tracks found in local stream');
        return;
      }
      
      // Get all senders from the peer connection
      const senders = pcRef.current.getSenders();
      const audioSender = senders.find(sender => 
        sender.track && sender.track.kind === 'audio'
      );
      
      if (!audioSender) {
        console.warn('No audio sender found in peer connection');
        return;
      }
      
      if (!isMicMuted) {
        // Store the original track for later restoration
        if (!audioSender.track) {
          console.warn('Audio sender has no track');
          return;
        }
        
        // Create a truly silent audio track
        const ctx = new AudioContext();
        const destination = ctx.createMediaStreamDestination();
        // Create a gain node with zero gain for true silence
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(destination);
        
        // Create a constant source for continuous silence
        const constantSource = ctx.createConstantSource();
        constantSource.connect(gainNode);
        constantSource.start();
        
        const silentTrack = destination.stream.getAudioTracks()[0];
        
        // Replace the track with the silent one
        await audioSender.replaceTrack(silentTrack);
        console.log('Audio track replaced with silent track');
        
        // Disable local audio track for local preview
        audioTracks.forEach(track => {
          track.enabled = false;
        });
        
        setIsMicMuted(true);
        console.log('Microphone muted');
      } else {
        // Restore the original audio track
        if (audioTracks.length > 0) {
          // Enable the original track first
          audioTracks.forEach(track => {
            track.enabled = true;
          });
          
          // Replace the silent track with the original
          await audioSender.replaceTrack(audioTracks[0]);
          console.log('Silent track replaced with original audio track');
        }
        
        setIsMicMuted(false);
        console.log('Microphone unmuted');
      }
      
      // Notify the partner about the audio state change
      if (socket && partnerId) {
        const newMutedState = !isMicMuted;
        socket.emit('signal', { 
          to: partnerId,
          signal: { 
            type: 'audio_state',
            muted: newMutedState
          }
        });
        console.log(`Sent audio state (muted: ${newMutedState}) to partner`);
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  };

  // Mute/unmute camera
  const toggleCamera = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    
    try {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn('No video tracks found in local stream');
        return;
      }
      
      // Get all senders from the peer connection
      const senders = pcRef.current.getSenders();
      const videoSender = senders.find(sender => 
        sender.track && sender.track.kind === 'video'
      );
      
      if (!videoSender) {
        console.warn('No video sender found in peer connection');
        return;
      }
      
      if (!isCameraMuted) {
        // Store the original track for later restoration
        if (!videoSender.track) {
          console.warn('Video sender has no track');
          return;
        }
        
        // Create a black video track
        const blackCanvas = document.createElement('canvas');
        blackCanvas.width = 640;
        blackCanvas.height = 480;
        const ctx = blackCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, blackCanvas.width, blackCanvas.height);
        }
        
        // Get a track from the canvas
        const blackStream = blackCanvas.captureStream(0); // 0 fps for static image
        const blackTrack = blackStream.getVideoTracks()[0];
        
        // Replace the track with the black one
        await videoSender.replaceTrack(blackTrack);
        console.log('Video track replaced with black track');
        
        // Disable local video track for local preview
        videoTracks.forEach(track => {
          track.enabled = false;
        });
        
        setIsCameraMuted(true);
        console.log('Camera muted');
      } else {
        // Restore the original video track
        if (videoTracks.length > 0) {
          // Enable the original track first
          videoTracks.forEach(track => {
            track.enabled = true;
          });
          
          // Replace the black track with the original
          await videoSender.replaceTrack(videoTracks[0]);
          console.log('Black track replaced with original video track');
        }
        
        setIsCameraMuted(false);
        console.log('Camera unmuted');
      }
      
      // Notify the partner about the video state change
      if (socket && partnerId) {
        const newMutedState = !isCameraMuted;
        socket.emit('signal', { 
          to: partnerId,
          signal: { 
            type: 'video_state',
            muted: newMutedState
          }
        });
        console.log(`Sent video state (muted: ${newMutedState}) to partner`);
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  // Skip to next partner function
  const skipToNextPartner = () => {
    console.log('Skipping to next partner');
    setStatus('Looking for new partner...');
    
    // Clean up current WebRTC connection
    if (pcRef.current) {
      console.log('Closing RTCPeerConnection to skip partner');
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Clear remote video
    if (remoteVideoRef.current?.srcObject) {
      console.log('Clearing remote video source to skip partner');
      remoteVideoRef.current.srcObject = null;
    }
    
    // Reset partner states
    setPartnerId('');
    setPartnerAudioMuted(false);
    setPartnerVideoMuted(false);
    
    // The server will automatically pair this user with another available user
    console.log('Skip initiated - waiting for new partner assignment');
  };

  // End call function
  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Reset state
    setPartnerId(null);
    setStatus('Call ended');
    localStreamRef.current = null;
    
    // Navigate back to home
    window.location.href = '/';
  };
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Mobile fullscreen styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          body {
            overflow: hidden;
          }
          
          /* Hide browser UI on mobile */
          .mobile-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for mobile */
          }
        }
      `}</style>
      
      <div className="mobile-fullscreen md:relative md:w-full md:h-screen">
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-2 md:p-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="px-2 py-1 md:px-4 md:py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 flex items-center gap-1 md:gap-2 text-sm md:text-base">
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            
            <div className="text-center">
              <h1 className="text-lg md:text-xl font-bold text-white">WhosNext</h1>
              <p className="text-xs md:text-sm text-white/80">{status}</p>
            </div>
            
            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>

      {/* Permission Notifications */}
      {cameraPermission === 'denied' && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-red-500/90 backdrop-blur-sm border border-red-400 text-white px-4 py-3 rounded-lg">
          <p className="font-bold">Camera access denied</p>
          <p className="text-sm">Please allow camera and microphone access in your browser settings to use video chat.</p>
          <button 
            onClick={() => requestCameraAccess()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Request Camera Access
          </button>
        </div>
      )}
      
      {cameraPermission === 'pending' && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-yellow-500/90 backdrop-blur-sm border border-yellow-400 text-white px-4 py-3 rounded-lg">
          <p className="font-bold">Waiting for camera permission</p>
          <p className="text-sm">Please allow access to your camera and microphone when prompted by the browser.</p>
        </div>
      )}

      {/* Partner Video - Fullscreen Background */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ backgroundColor: '#1a1a1a' }}
        />
        {partnerId && partnerVideoMuted && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Camera turned off</h3>
              <p className="text-white/70">Your partner has disabled their camera</p>
            </div>
          </div>
        )}
        {!partnerId && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center p-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-white/60 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div className="absolute -inset-2 border-2 border-white/20 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Looking for someone...</h3>
              <p className="text-white/70">We&apos;re connecting you with a random person</p>
            </div>
          </div>
        )}
        
        {/* Partner mute indicators */}
        {partnerId && (
          <div className="absolute top-4 left-4 flex gap-2">
            {partnerAudioMuted && (
              <div className="bg-red-500/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span className="text-xs text-white">Microphone off</span>
              </div>
            )}
            
            {partnerVideoMuted && (
              <div className="bg-red-500/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span className="text-xs text-white">Camera off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Local Video - Picture-in-Picture Style */}
      <div className="absolute top-20 right-4 z-10 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ backgroundColor: '#1a1a1a' }}
        />
        {(cameraPermission !== 'granted' || isCameraMuted) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90">
            <div className="text-center p-2">
              <svg className="mx-auto h-8 w-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                {isCameraMuted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />}
              </svg>
              <p className="mt-1 text-xs text-white/60">
                {isCameraMuted ? 'Camera off' : 'Camera not available'}
              </p>
            </div>
          </div>
        )}
        
        {/* Local video label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-xs text-white/80 text-center">You</p>
        </div>
      </div>

      {/* Online Users Count */}
      <div className="absolute top-2 md:top-4 right-2 md:right-4 z-30">
        <div className="bg-blue-500/80 backdrop-blur-sm rounded-lg px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-1 md:gap-1.5">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-white font-medium">{onlineUsers} online</span>
        </div>
      </div>
      
      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-3 md:p-6">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          {/* Control buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Microphone Toggle Button */}
            <button 
              onClick={toggleMicrophone}
              className={`w-14 h-14 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 ${
                isMicMuted 
                  ? 'bg-red-500/80 hover:bg-red-600/80' 
                  : 'bg-gray-500/80 hover:bg-gray-600/80'
              }`}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMicMuted ? (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            
            {/* Camera Toggle Button */}
            <button 
              onClick={toggleCamera}
              className={`w-14 h-14 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 ${
                isCameraMuted 
                  ? 'bg-red-500/80 hover:bg-red-600/80' 
                  : 'bg-gray-500/80 hover:bg-gray-600/80'
              }`}
              title={isCameraMuted ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isCameraMuted ? (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m-2-2l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            {/* Skip Button - Only show when connected to a partner */}
            {partnerId && (
              <button 
                onClick={skipToNextPartner}
                className="w-14 h-14 bg-blue-500/80 hover:bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200"
                title="Skip to Next Partner"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {partnerId && (
          <div className="text-center mt-2 md:mt-3">
            <p className="text-xs md:text-sm text-white/70">Connected with: {partnerId.substring(0, 8)}</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}