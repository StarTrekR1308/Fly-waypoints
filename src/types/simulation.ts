export type Emotion = 'happy' | 'sad' | 'neutral' | 'ecstatic';

export type CameraMode = 'follow' | 'firstPerson' | 'topDown' | 'orbit';
export type ControlMode = 'auto' | 'manual';
export type ArenaPreset = 'slalom' | 'windTunnel' | 'garden';

export interface Waypoint {
  id: number;
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  isGoal?: boolean;
}

export interface FlyAgentState {
  x: number;
  y: number;
  z: number;
  heading: number; // yaw in radians
  pitch: number;
  roll: number;
  speed: number;
  wingBeatPhase: number;
  legPhase: number;
}

export interface SensorInputs {
  distanceToTarget: number;
  deltaDistance: number; // current - last
  angleToTarget: number; // relative bearing [-PI, PI]
  eyeLeftBrightness: number;
  eyeRightBrightness: number;
  antennaOdorStrength: number;
  halteresYawRate: number;
  forwardSpeed: number;
}

export interface MotorOutputs {
  thrust: number; // 0 to 1
  turn: number; // -1 (left) to +1 (right)
  pitchRate: number; // -1 to +1
  wingAmplitude: number; // 0 to 1
}

export interface NeuronActivation {
  id: string;
  name: string;
  region: 'SENSORY' | 'CENTRAL_COMPLEX' | 'MUSHROOM_BODY' | 'DESCENDING_MOTOR';
  subregion: string;
  activation: number; // 0.0 to 1.0
  dopamineModulation?: number;
}

export interface SynapseConnection {
  from: string;
  to: string;
  weight: number;
  neurotransmitter: 'ACh' | 'GABA' | 'Dopamine' | 'Octopamine' | 'Glutamate';
}

export interface EmotionState {
  currentEmotion: Emotion;
  dopamine: number; // 0.0 to 1.0 (positive reward sensation)
  octopamine: number; // 0.0 to 1.0 (arousal / distress)
  currentReward: number;
  cumulativeReward: number;
  stepPenalty: number;
  targetApproached: boolean;
  distanceDelta: number;
}

export interface SimulationStats {
  generation: number;
  episode: number;
  stepCount: number;
  activeWaypointIndex: number;
  waypointsCompleted: number;
  totalWaypoints: number;
  hasReachedGoal: boolean;
  bestDistanceToGoal: number;
  avgReward: number;
}
