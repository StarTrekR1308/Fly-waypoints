import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  FlyAgentState,
  CameraMode,
  ArenaPreset
} from '../types/simulation';
import { ARENA_WAYPOINTS } from '../simulation/connectome';
import { FunctionalFlyBrain } from '../simulation/flywireConnectome';

interface FlySimulation3DProps {
  brain: FunctionalFlyBrain;
  arenaPreset: ArenaPreset;
  cameraMode: CameraMode;
  simSpeed: number;
  onUpdateTelemetry: (data: {
    activeWp: number;
    distToWp: number;
    deltaDist: number;
    isHappy: boolean;
    dopamine: number;
    octopamine: number;
    turn: number;
    thrust: number;
    completedCount: number;
    hasReachedGoal: boolean;
    generation: number;
  }) => void;
}

export const FlySimulation3D: React.FC<FlySimulation3DProps> = ({
  brain,
  arenaPreset,
  cameraMode,
  simSpeed,
  onUpdateTelemetry,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const waypoints = ARENA_WAYPOINTS[arenaPreset] || ARENA_WAYPOINTS.slalom;
  const activeWpIndexRef = useRef(0);
  const generationRef = useRef(1);

  // Agent spatial state:
  // Forward in Three.js is -Z. Heading = 0 means facing directly towards -Z (towards WP1 at z = -15).
  const agentRef = useRef<FlyAgentState>({
    x: 0,
    y: 1.5,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0.22,
    wingBeatPhase: 0,
    legPhase: 0,
  });

  const lastDistRef = useRef(0);

  // Three.js internal scene refs
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    flyGroup: THREE.Group;
    wingLeft: THREE.Mesh;
    wingRight: THREE.Mesh;
    haltereLeft: THREE.Mesh;
    haltereRight: THREE.Mesh;
    eyes: THREE.Mesh[];
    antennaeTips: THREE.Mesh[];
    waypointMeshes: THREE.Group[];
    goalMesh: THREE.Group | null;
    trailPositions: Float32Array;
    trailColors: Float32Array;
    trailCount: number;
    flightTrail: THREE.Line;
    targetLine: THREE.Line;
    orbit: { isDragging: boolean; prevX: number; prevY: number; theta: number; phi: number; radius: number };
  } | null>(null);

  // Reset agent position
  const resetAgent = useCallback((nextGen = false) => {
    const a = agentRef.current;
    a.x = 0;
    a.y = 1.5;
    a.z = 0;
    a.heading = 0; // Facing -Z directly toward WP 1
    a.pitch = 0;
    a.roll = 0;
    a.speed = 0.22;

    activeWpIndexRef.current = 0;
    const firstWp = waypoints[0];
    lastDistRef.current = Math.hypot(firstWp.x - a.x, firstWp.z - a.z);

    if (nextGen) {
      generationRef.current += 1;
    }

    if (threeRef.current) {
      threeRef.current.trailCount = 0;
      threeRef.current.flightTrail.geometry.setDrawRange(0, 0);
    }
  }, [waypoints]);

  // Handle arena change
  useEffect(() => {
    resetAgent(false);
  }, [arenaPreset, resetAgent]);

  // Scene setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.008);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    // Initial camera position behind fly looking towards -Z
    camera.position.set(0, 4.5, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const amb = new THREE.AmbientLight(0x475569, 1.4);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xfff7ed, 2.5);
    key.position.set(25, 45, 25);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x06b6d4, 1.2);
    fill.position.set(-25, 20, -50);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x10b981, 1.0);
    rim.position.set(0, 15, -100);
    scene.add(rim);

    // Ground Grid & Floor
    const grid = new THREE.GridHelper(300, 150, 0x1e293b, 0x0f172a);
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Construct 3D Fly Bio-Robot:
    // Important: Model must face FORWARD (-Z) when rotation.y = 0!
    const flyGroup = new THREE.Group();
    scene.add(flyGroup);

    const chitin = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.3,
      clearcoat: 0.6
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const wingMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.65,
      transmission: 0.8,
      roughness: 0.1,
      side: THREE.DoubleSide
    });
    const sensorTipMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // Thorax (Center of Fly)
    const thoraxGeo = new THREE.SphereGeometry(0.7, 16, 16);
    thoraxGeo.scale(1.0, 0.85, 1.35);
    const thorax = new THREE.Mesh(thoraxGeo, chitin);
    thorax.castShadow = true;
    flyGroup.add(thorax);

    // Head placed in FORWARD direction (-Z)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.1, -0.9);
    const headGeo = new THREE.SphereGeometry(0.48, 16, 16);
    headGeo.scale(1.1, 0.9, 0.85);
    const head = new THREE.Mesh(headGeo, chitin);
    head.castShadow = true;
    headGroup.add(head);

    // Eyes on head facing forward-lateral
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), eyeMat);
    eyeL.position.set(-0.35, 0.12, -0.15);
    eyeL.scale.set(1.1, 1.1, 0.8);
    headGroup.add(eyeL);

    const eyeR = eyeL.clone();
    eyeR.position.set(0.35, 0.12, -0.15);
    headGroup.add(eyeR);

    // Antennae pointing forward (-Z)
    const antennaeTips: THREE.Mesh[] = [];
    [-0.14, 0.14].forEach((off) => {
      const antCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(off, 0.1, -0.35),
        new THREE.Vector3(off * 1.5, 0.35, -0.6),
        new THREE.Vector3(off * 1.8, 0.45, -0.8),
        new THREE.Vector3(off * 2.0, 0.5, -1.0)
      );
      const ant = new THREE.Mesh(new THREE.TubeGeometry(antCurve, 8, 0.02, 6, false), chitin);
      headGroup.add(ant);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), sensorTipMat);
      tip.position.set(off * 2.0, 0.5, -1.0);
      headGroup.add(tip);
      antennaeTips.push(tip);
    });

    flyGroup.add(headGroup);

    // Abdomen placed in BACKWARD direction (+Z)
    const abdGeo = new THREE.SphereGeometry(0.85, 16, 16);
    abdGeo.scale(0.8, 0.7, 1.8);
    const abdomen = new THREE.Mesh(abdGeo, chitin);
    abdomen.position.set(0, -0.1, 1.45);
    abdomen.castShadow = true;
    flyGroup.add(abdomen);

    // Wings attached to Thorax
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.6, 0.3, 1.8, 0.8, 2.5, 0.3);
    wingShape.bezierCurveTo(2.7, -0.1, 2.3, -0.5, 1.5, -0.6);
    wingShape.bezierCurveTo(0.8, -0.5, 0.3, -0.3, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);

    // Left Wing
    const wingLeft = new THREE.Mesh(wingGeo, wingMat);
    wingLeft.position.set(-0.4, 0.4, 0.1);
    wingLeft.rotation.x = Math.PI / 2;
    wingLeft.rotation.z = -Math.PI + 0.4;
    flyGroup.add(wingLeft);

    // Right Wing
    const wingRight = new THREE.Mesh(wingGeo, wingMat);
    wingRight.position.set(0.4, 0.4, 0.1);
    wingRight.rotation.x = Math.PI / 2;
    wingRight.rotation.y = Math.PI;
    wingRight.rotation.z = Math.PI - 0.4;
    flyGroup.add(wingRight);

    // Halteres
    const createHaltere = () => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28), chitin);
      stem.position.y = 0.14;
      const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      hHead.position.y = 0.28;
      g.add(stem, hHead);
      return g;
    };
    const haltereLeft = createHaltere() as unknown as THREE.Mesh;
    haltereLeft.position.set(-0.45, 0.15, 0.75);
    haltereLeft.rotation.z = Math.PI / 3;
    flyGroup.add(haltereLeft);

    const haltereRight = createHaltere() as unknown as THREE.Mesh;
    haltereRight.position.set(0.45, 0.15, 0.75);
    haltereRight.rotation.z = -Math.PI / 3;
    flyGroup.add(haltereRight);

    // 6 Articulated Legs
    const legPositions = [
      { x: -0.5, z: -0.4 },
      { x: -0.6, z: 0.0 },
      { x: -0.5, z: 0.5 },
      { x: 0.5, z: -0.4 },
      { x: 0.6, z: 0.0 },
      { x: 0.5, z: 0.5 },
    ];
    legPositions.forEach((pos) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, -0.2, pos.z);
      const coxa = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.4), chitin);
      coxa.rotation.z = pos.x < 0 ? -1.0 : 1.0;
      legGroup.add(coxa);
      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.5), chitin);
      tibia.position.set(pos.x < 0 ? -0.3 : 0.3, -0.25, 0);
      tibia.rotation.z = pos.x < 0 ? 0.7 : -0.7;
      legGroup.add(tibia);
      flyGroup.add(legGroup);
    });

    // Waypoints in 3D scene (6 Waypoints + 1 Sugar Goal)
    const waypointMeshes: THREE.Group[] = [];
    let goalMeshGroup: THREE.Group | null = null;

    waypoints.forEach((wp) => {
      const g = new THREE.Group();
      g.position.set(wp.x, wp.y, wp.z);

      if (wp.isGoal) {
        // Final Goal: Crystal Sugar Drop
        const sugar = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.6, 2),
          new THREE.MeshPhysicalMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.6,
            roughness: 0.1,
            metalness: 0.2,
            transmission: 0.6
          })
        );
        sugar.castShadow = true;
        g.add(sugar);

        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(2.3, 0.08, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
        );
        halo.rotation.x = Math.PI / 2;
        g.add(halo);

        goalMeshGroup = g;
      } else {
        // Waypoint Hologram Ring
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(wp.radius * 0.7, 0.08, 16, 64),
          new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 })
        );
        ring.rotation.x = Math.PI / 2;
        g.add(ring);

        // Core Orb
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        g.add(core);

        // Ground shadow ring
        const gRing = new THREE.Mesh(
          new THREE.RingGeometry(0.2, wp.radius * 0.8, 32),
          new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
        );
        gRing.rotation.x = -Math.PI / 2;
        gRing.position.y = -wp.y + 0.02;
        g.add(gRing);
      }

      scene.add(g);
      waypointMeshes.push(g);
    });

    // Fixed-size Buffer Geometry for Flight Trail (Prevents "Buffer size too small" warning!)
    const maxTrailPoints = 250;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    const trailColors = new Float32Array(maxTrailPoints * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setDrawRange(0, 0);

    const flightTrail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, linewidth: 3 })
    );
    scene.add(flightTrail);

    // Target laser beam
    const pointerGeo = new THREE.BufferGeometry();
    pointerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const targetLine = new THREE.Line(
      pointerGeo,
      new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.35 })
    );
    scene.add(targetLine);

    // Orbit Controls
    const orbit = { isDragging: false, prevX: 0, prevY: 0, theta: 0, phi: Math.PI / 3, radius: 10 };

    const onMouseDown = (e: MouseEvent) => {
      if (cameraMode === 'orbit') {
        orbit.isDragging = true;
        orbit.prevX = e.clientX;
        orbit.prevY = e.clientY;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (cameraMode === 'orbit' && orbit.isDragging) {
        const dx = e.clientX - orbit.prevX;
        const dy = e.clientY - orbit.prevY;
        orbit.theta -= dx * 0.008;
        orbit.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbit.phi - dy * 0.008));
        orbit.prevX = e.clientX;
        orbit.prevY = e.clientY;
      }
    };
    const onMouseUp = () => (orbit.isDragging = false);
    const onWheel = (e: WheelEvent) => {
      if (cameraMode === 'orbit') {
        orbit.radius = Math.max(3, Math.min(45, orbit.radius + e.deltaY * 0.02));
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel);

    threeRef.current = {
      scene,
      camera,
      renderer,
      flyGroup,
      wingLeft,
      wingRight,
      haltereLeft,
      haltereRight,
      eyes: [eyeL, eyeR],
      antennaeTips,
      waypointMeshes,
      goalMesh: goalMeshGroup,
      trailPositions,
      trailColors,
      trailCount: 0,
      flightTrail,
      targetLine,
      orbit
    };

    const onResize = () => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [waypoints, cameraMode]);

  // Main Simulation & Autonomous Fly Brain Loop
  useEffect(() => {
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!threeRef.current) return;
      const {
        scene,
        camera,
        renderer,
        flyGroup,
        wingLeft,
        wingRight,
        haltereLeft,
        haltereRight,
        eyes,
        antennaeTips,
        waypointMeshes,
        goalMesh,
        flightTrail,
        trailPositions,
        trailColors,
        targetLine,
        orbit
      } = threeRef.current;

      const agent = agentRef.current;

      if (simSpeed > 0) {
        const subSteps = Math.min(10, Math.max(1, Math.round(simSpeed)));

        for (let s = 0; s < subSteps; s++) {
          const currentWpIndex = activeWpIndexRef.current;
          const targetWp = waypoints[currentWpIndex] || waypoints[waypoints.length - 1];

          // Vector to active waypoint
          const dx = targetWp.x - agent.x;
          const dz = targetWp.z - agent.z;
          const distToWp = Math.hypot(dx, dz);

          // In Three.js, facing -Z is angle 0.
          const targetAngle = Math.atan2(dx, -dz);
          let angleDiff = targetAngle - agent.heading;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const deltaDist = distToWp - lastDistRef.current;
          lastDistRef.current = distToWp;

          // 100% AUTONOMOUS FLY BRAIN CONTROL
          const out = brain.step(angleDiff, distToWp, deltaDist, agent.speed);

          // Echte Fliegen-Aerodynamik & Biomechanik:
          // 1. Kurvenflug: Heading steuert exakt dorthin, wo die Fliege hinfliegt!
          agent.heading += out.turn * 0.085;
          // Sanfte Kurvenneigung (Roll)
          agent.roll = THREE.MathUtils.lerp(agent.roll, -out.turn * 0.45, 0.15);

          // 2. Nickwinkel (Pitch)
          const targetPitch = THREE.MathUtils.clamp((targetWp.y - agent.y) * 0.12, -0.25, 0.25);
          agent.pitch = THREE.MathUtils.lerp(agent.pitch, targetPitch, 0.1);

          // 3. Vorwärtsgeschwindigkeit: Kopf & Flugvektor sind 1:1 gekoppelt
          const forwardVelocity = Math.max(0.18, out.thrust * 0.33);
          agent.speed = forwardVelocity;
          agent.x += Math.sin(agent.heading) * forwardVelocity;
          agent.z -= Math.cos(agent.heading) * forwardVelocity;
          agent.y = THREE.MathUtils.lerp(agent.y, targetWp.y, 0.06);

          // 4. Wegpunkt-Kollision: Dezente Belohnung unterwegs, Maximaler Zucker-Reward am Ende
          const hitRadius = targetWp.radius + 1.2;
          if (distToWp < hitRadius) {
            const isGoal = Boolean(targetWp.isGoal);

            // Moduliertes Dopamin: sanft bei Wegpunkten (0.70), Maximum bei Zucker (1.0)
            brain.triggerWaypointReward(isGoal);

            // Reduziertes, dezentes Konfetti (kein Bildschirm-Spam)
            if (isGoal) {
              confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#f59e0b', '#fbbf24', '#10b981']
              });
              setTimeout(() => {
                resetAgent(true);
              }, 1400);
            } else {
              // Sehr dezent: nur ein kleiner Partikelschimmer bei Zwischen-Wegpunkten
              confetti({
                particleCount: 15,
                spread: 45,
                origin: { y: 0.75 },
                colors: ['#10b981', '#06b6d4']
              });

              // Nächster Wegpunkt
              activeWpIndexRef.current = Math.min(waypoints.length - 1, currentWpIndex + 1);
              lastDistRef.current = Math.hypot(
                waypoints[activeWpIndexRef.current].x - agent.x,
                waypoints[activeWpIndexRef.current].z - agent.z
              );
            }
          }

          // Boundary safeguard
          if (Math.abs(agent.x) > 130 || Math.abs(agent.z) > 240) {
            resetAgent(true);
            break;
          }

          // Emit telemetry to UI (mit realem Dopaminspiegel)
          const isMilestone = distToWp < hitRadius;
          const currentDopamine = isMilestone ? (targetWp.isGoal ? 1.0 : 0.70) : out.dopamine;
          onUpdateTelemetry({
            activeWp: activeWpIndexRef.current,
            distToWp,
            deltaDist,
            isHappy: isMilestone ? true : out.isHappy,
            dopamine: currentDopamine,
            octopamine: isMilestone ? 0.05 : out.octopamine,
            turn: out.turn,
            thrust: out.thrust,
            completedCount: activeWpIndexRef.current,
            hasReachedGoal: Boolean(targetWp.isGoal && distToWp < hitRadius),
            generation: generationRef.current
          });
        }
      }

      // 3D Object Transforms: Kopf zeigt immer exakt in Flugrichtung (-Z in local space)
      const bodyWobble = Math.sin(agent.wingBeatPhase * 1.5) * 0.02;
      flyGroup.position.set(agent.x, agent.y + bodyWobble, agent.z);
      flyGroup.rotation.order = 'YXZ';
      flyGroup.rotation.y = agent.heading;
      flyGroup.rotation.x = agent.pitch;
      flyGroup.rotation.z = agent.roll;

      // Realistische asymmetrische Flügelkinematik:
      // Bei Rechtskurven schlägt der linke Flügel mit höherer Amplitude, bei Linkskurven der rechte!
      agent.wingBeatPhase += 0.9 + agent.speed * 2.8;
      const wingA = Math.sin(agent.wingBeatPhase) * 0.75;
      const turnBiasWing = (agent.roll) * 0.35; // Asymmetrie durch Kurvenneigung
      wingLeft.rotation.z = -Math.PI + 0.4 + (wingA * (1.0 - turnBiasWing));
      wingRight.rotation.z = Math.PI - 0.4 - (wingA * (1.0 + turnBiasWing));

      const hA = Math.sin(agent.wingBeatPhase + Math.PI / 2) * 0.5;
      haltereLeft.rotation.x = hA;
      haltereRight.rotation.x = -hA;

      // Compound Eyes & Antenna glow based on biological dopamine
      const isHappyNow = brain.dopamineLevel > brain.octopamineLevel;
      const eyeCol = isHappyNow ? 0x10b981 : 0xef4444;
      eyes.forEach(e => ((e.material as THREE.MeshPhysicalMaterial).emissive.setHex(eyeCol)));
      antennaeTips.forEach(t => ((t.material as THREE.MeshBasicMaterial).color.setHex(eyeCol)));

      // Rotate Final Goal
      if (goalMesh) {
        goalMesh.rotation.y += 0.02;
      }

      // Highlight active waypoint
      const currentIdx = activeWpIndexRef.current;
      waypointMeshes.forEach((mesh, idx) => {
        mesh.visible = true;
        if (idx === currentIdx) {
          const s = 1.0 + Math.sin(performance.now() * 0.006) * 0.15;
          mesh.scale.set(s, s, s);
        } else {
          mesh.scale.set(1.0, 1.0, 1.0);
        }
      });

      // Update Fixed-buffer Flight Trail (No Buffer Size errors!)
      if (simSpeed > 0) {
        const maxPoints = 250;
        let count = threeRef.current.trailCount;

        if (count < maxPoints) {
          count++;
          threeRef.current.trailCount = count;
        } else {
          // Shift buffer left by 1 point (3 floats)
          trailPositions.copyWithin(0, 3, maxPoints * 3);
          trailColors.copyWithin(0, 3, maxPoints * 3);
        }

        const idx = (count - 1) * 3;
        trailPositions[idx] = agent.x;
        trailPositions[idx + 1] = agent.y;
        trailPositions[idx + 2] = agent.z;

        if (isHappyNow) {
          trailColors[idx] = 0.06; // R
          trailColors[idx + 1] = 0.72; // G
          trailColors[idx + 2] = 0.50; // B (Emerald green)
        } else {
          trailColors[idx] = 0.95; // R
          trailColors[idx + 1] = 0.25; // G
          trailColors[idx + 2] = 0.35; // B (Red)
        }

        flightTrail.geometry.setDrawRange(0, count);
        flightTrail.geometry.attributes.position.needsUpdate = true;
        flightTrail.geometry.attributes.color.needsUpdate = true;
      }

      // Target laser beam
      const currentWp = waypoints[currentIdx] || waypoints[0];
      const pArr = (targetLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      pArr[0] = agent.x;
      pArr[1] = agent.y + 0.3;
      pArr[2] = agent.z;
      pArr[3] = currentWp.x;
      pArr[4] = currentWp.y;
      pArr[5] = currentWp.z;
      targetLine.geometry.attributes.position.needsUpdate = true;

      // CAMERA CHOREOGRAPHY:
      // Real, clean 3rd-person follow camera directly behind the fly!
      if (cameraMode === 'follow') {
        const followDistance = 7.5;
        const followHeight = 3.2;

        // Position camera behind fly relative to its current heading
        const camX = agent.x - Math.sin(agent.heading) * followDistance;
        const camZ = agent.z + Math.cos(agent.heading) * followDistance;
        const camY = agent.y + followHeight;

        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
        // Look ahead of the fly
        const lookTarget = new THREE.Vector3(
          agent.x + Math.sin(agent.heading) * 3,
          agent.y + 0.4,
          agent.z - Math.cos(agent.heading) * 3
        );
        camera.lookAt(lookTarget);
      } else if (cameraMode === 'firstPerson') {
        // Cockpit eye view
        camera.position.set(
          agent.x + Math.sin(agent.heading) * 0.8,
          agent.y + 0.2,
          agent.z - Math.cos(agent.heading) * 0.8
        );
        camera.lookAt(
          agent.x + Math.sin(agent.heading) * 20,
          agent.y + agent.pitch * 3,
          agent.z - Math.cos(agent.heading) * 20
        );
      } else if (cameraMode === 'topDown') {
        // Top-down tactical overview
        camera.position.lerp(new THREE.Vector3(agent.x, 60, agent.z - 15), 0.08);
        camera.lookAt(agent.x, 0, agent.z - 15);
      } else if (cameraMode === 'orbit') {
        // Free orbit around the fly
        const o = orbit;
        const ox = agent.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta);
        const oy = agent.y + o.radius * Math.cos(o.phi);
        const oz = agent.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta);
        camera.position.set(ox, oy, oz);
        camera.lookAt(agent.x, agent.y, agent.z);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [simSpeed, brain, waypoints, cameraMode, resetAgent, onUpdateTelemetry]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Fly Eye Facet Filter in 1st Person Mode */}
      {cameraMode === 'firstPerson' && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at center, transparent 35%, rgba(6, 182, 212, 0.4) 100%),
              repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 4px, rgba(16, 185, 129, 0.25) 5px)`
          }}
        />
      )}

      {/* Reset Button */}
      <button
        onClick={() => resetAgent(false)}
        className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 rounded border border-white/10 transition-colors"
      >
        Fliege zurücksetzen
      </button>
    </div>
  );
};
