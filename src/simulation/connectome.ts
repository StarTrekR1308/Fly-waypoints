import {
  SensorInputs,
  MotorOutputs,
  NeuronActivation,
  SynapseConnection,
  Waypoint,
  EmotionState
} from '../types/simulation';

// Waypoint layouts: Exactly 6 sequential waypoints + 1 Final Goal (7 points total)
export const ARENA_WAYPOINTS: Record<string, Waypoint[]> = {
  slalom: [
    { id: 1, label: 'WP 1', x: 0, y: 1.5, z: -15, radius: 2.5 },
    { id: 2, label: 'WP 2', x: 12, y: 2.2, z: -30, radius: 2.5 },
    { id: 3, label: 'WP 3', x: -10, y: 1.8, z: -50, radius: 2.5 },
    { id: 4, label: 'WP 4', x: 15, y: 2.6, z: -70, radius: 2.5 },
    { id: 5, label: 'WP 5', x: -5, y: 2.0, z: -90, radius: 2.5 },
    { id: 6, label: 'WP 6', x: 8, y: 1.9, z: -110, radius: 2.5 },
    { id: 7, label: 'ZIEL (Zucker)', x: 0, y: 2.4, z: -130, radius: 3.5, isGoal: true }
  ],
  windTunnel: [
    { id: 1, label: 'WP 1', x: 2, y: 1.5, z: -12, radius: 2.5 },
    { id: 2, label: 'WP 2', x: -3, y: 1.8, z: -28, radius: 2.5 },
    { id: 3, label: 'WP 3', x: 4, y: 2.2, z: -46, radius: 2.5 },
    { id: 4, label: 'WP 4', x: -2, y: 1.6, z: -64, radius: 2.5 },
    { id: 5, label: 'WP 5', x: 3, y: 2.0, z: -82, radius: 2.5 },
    { id: 6, label: 'WP 6', x: -1, y: 2.3, z: -100, radius: 2.5 },
    { id: 7, label: 'ZIEL (Pheromon)', x: 0, y: 2.0, z: -120, radius: 3.5, isGoal: true }
  ],
  garden: [
    { id: 1, label: 'WP 1', x: -8, y: 1.8, z: -18, radius: 2.5 },
    { id: 2, label: 'WP 2', x: 14, y: 2.5, z: -35, radius: 2.5 },
    { id: 3, label: 'WP 3', x: 16, y: 3.0, z: -60, radius: 2.5 },
    { id: 4, label: 'WP 4', x: -12, y: 2.0, z: -80, radius: 2.5 },
    { id: 5, label: 'WP 5', x: -14, y: 2.8, z: -105, radius: 2.5 },
    { id: 6, label: 'WP 6', x: 10, y: 2.2, z: -125, radius: 2.5 },
    { id: 7, label: 'ZIEL (Nektar)', x: 0, y: 2.0, z: -145, radius: 3.5, isGoal: true }
  ]
};

// Modeled biological neural circuit from the Drosophila connectome
export class DrosophilaConnectome {
  // Neuron state containers
  public neurons: Map<string, NeuronActivation> = new Map();
  public synapses: SynapseConnection[] = [];

  // Synaptic weight matrices
  // 1. Sensory -> Central Complex (Heading Ring Attractor)
  private wSensoryToCx: number[][] = [];
  // 2. Central Complex -> Mushroom Body & Premotor
  private wCxToMb: number[][] = [];
  // 3. Mushroom Body & CX -> Descending Motor Neurons
  private wToMotor: number[][] = [];

  // Reward history for Policy Gradient / STDP updates
  private recentTrace: {
    inputs: number[];
    cxActs: number[];
    motorActs: number[];
    actionTaken: [number, number];
  }[] = [];

  // Best weights memory
  public bestGenome: {
    wSensoryToCx: number[][];
    wCxToMb: number[][];
    wToMotor: number[][];
  } | null = null;

  constructor() {
    this.initNetworkTopology();
    this.randomizeWeights();
  }

  private initNetworkTopology() {
    // 1. Sensory Layer (Lobula Plate & Antennae)
    this.addNeuron('S_EYE_L', 'Lobula L (Auge)', 'SENSORY', 'Optic Lobe');
    this.addNeuron('S_EYE_R', 'Lobula R (Auge)', 'SENSORY', 'Optic Lobe');
    this.addNeuron('S_BEARING', 'Target Angle (Kompass)', 'SENSORY', 'Anterior Optic');
    this.addNeuron('S_DIST', 'Antenna Odor/Distance', 'SENSORY', 'Antennal Lobe');
    this.addNeuron('S_DELTA_D', 'Velocity Distance Rate', 'SENSORY', 'Lateral Horn');
    this.addNeuron('S_GYRO', 'Halteren Gyroscope', 'SENSORY', 'Mechanosensory');

    // 2. Central Complex (CX) - True Drosophila Navigation Core
    // E-PG Compass Ring Neurons (Ellipsoid Body)
    this.addNeuron('CX_EPG_L', 'E-PG Compass Left', 'CENTRAL_COMPLEX', 'Ellipsoid Body');
    this.addNeuron('CX_EPG_C', 'E-PG Compass Center', 'CENTRAL_COMPLEX', 'Ellipsoid Body');
    this.addNeuron('CX_EPG_R', 'E-PG Compass Right', 'CENTRAL_COMPLEX', 'Ellipsoid Body');
    // Protocerebral Bridge (PB) & Fan-shaped Body (FB) vector steering
    this.addNeuron('CX_FB_GOAL', 'FB4R Vector Steering', 'CENTRAL_COMPLEX', 'Fan-Shaped Body');
    this.addNeuron('CX_PB_SHIFT', 'P-EN Ring Attractor', 'CENTRAL_COMPLEX', 'Protocerebral Bridge');
    this.addNeuron('CX_NO_SPEED', 'Noduli (Speed Integrator)', 'CENTRAL_COMPLEX', 'Noduli');

    // 3. Mushroom Body (MB) - Associative Learning & Reward
    this.addNeuron('MB_KC_ALPHA', 'Kenyon Cells α/β', 'MUSHROOM_BODY', 'Mushroom Body Calyx');
    this.addNeuron('MB_PAM_DAN', 'PAM Cluster (Dopamin +)', 'MUSHROOM_BODY', 'Dopaminergic System');
    this.addNeuron('MB_PPL1_DAN', 'PPL1 Cluster (Aversion -)', 'MUSHROOM_BODY', 'Dopaminergic System');
    this.addNeuron('MB_MBON_APPROACH', 'MBON-γ5 (Annäherung)', 'MUSHROOM_BODY', 'MB Output Neurons');
    this.addNeuron('MB_MBON_AVOID', 'MBON-α1 (Abwendung)', 'MUSHROOM_BODY', 'MB Output Neurons');

    // 4. Descending Motor Neurons (DNs)
    this.addNeuron('DN_TURN_L', 'DNa01 (Turn Left)', 'DESCENDING_MOTOR', 'Ventral Nerve Cord');
    this.addNeuron('DN_TURN_R', 'DNa02 (Turn Right)', 'DESCENDING_MOTOR', 'Ventral Nerve Cord');
    this.addNeuron('DN_THRUST', 'DNb01 (Wing Power)', 'DESCENDING_MOTOR', 'Flight Motor Center');
    this.addNeuron('DN_PITCH', 'DNp01 (Altitude Trim)', 'DESCENDING_MOTOR', 'Thoracic Ganglion');

    // Build visualization synapses
    this.synapses = [
      // Sensory -> CX
      { from: 'S_BEARING', to: 'CX_EPG_L', weight: 0.8, neurotransmitter: 'ACh' },
      { from: 'S_BEARING', to: 'CX_EPG_C', weight: 0.9, neurotransmitter: 'ACh' },
      { from: 'S_BEARING', to: 'CX_EPG_R', weight: 0.8, neurotransmitter: 'ACh' },
      { from: 'S_EYE_L', to: 'CX_EPG_L', weight: 0.6, neurotransmitter: 'ACh' },
      { from: 'S_EYE_R', to: 'CX_EPG_R', weight: 0.6, neurotransmitter: 'ACh' },
      { from: 'S_DIST', to: 'CX_FB_GOAL', weight: 0.7, neurotransmitter: 'ACh' },
      { from: 'S_DELTA_D', to: 'CX_NO_SPEED', weight: 0.5, neurotransmitter: 'Glutamate' },
      { from: 'S_GYRO', to: 'CX_PB_SHIFT', weight: 0.6, neurotransmitter: 'GABA' },

      // CX -> MB
      { from: 'CX_FB_GOAL', to: 'MB_KC_ALPHA', weight: 0.7, neurotransmitter: 'ACh' },
      { from: 'CX_NO_SPEED', to: 'MB_PAM_DAN', weight: 0.5, neurotransmitter: 'Dopamine' },
      { from: 'CX_PB_SHIFT', to: 'MB_PPL1_DAN', weight: 0.4, neurotransmitter: 'Octopamine' },
      { from: 'MB_PAM_DAN', to: 'MB_MBON_APPROACH', weight: 0.9, neurotransmitter: 'Dopamine' },
      { from: 'MB_PPL1_DAN', to: 'MB_MBON_AVOID', weight: 0.8, neurotransmitter: 'GABA' },
      { from: 'MB_KC_ALPHA', to: 'MB_MBON_APPROACH', weight: 0.75, neurotransmitter: 'ACh' },

      // MB & CX -> Descending Motor Neurons
      { from: 'CX_EPG_L', to: 'DN_TURN_L', weight: 0.85, neurotransmitter: 'ACh' },
      { from: 'CX_EPG_R', to: 'DN_TURN_R', weight: 0.85, neurotransmitter: 'ACh' },
      { from: 'MB_MBON_APPROACH', to: 'DN_THRUST', weight: 0.9, neurotransmitter: 'ACh' },
      { from: 'MB_MBON_AVOID', to: 'DN_PITCH', weight: 0.4, neurotransmitter: 'GABA' },
      { from: 'CX_FB_GOAL', to: 'DN_THRUST', weight: 0.6, neurotransmitter: 'ACh' }
    ];
  }

  private addNeuron(id: string, name: string, region: NeuronActivation['region'], subregion: string) {
    this.neurons.set(id, { id, name, region, subregion, activation: 0 });
  }

  private randomizeWeights() {
    // 6 inputs -> 6 CX
    this.wSensoryToCx = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, () => (Math.random() - 0.5) * 1.5)
    );
    // 6 CX -> 5 MB
    this.wCxToMb = Array.from({ length: 5 }, () =>
      Array.from({ length: 6 }, () => (Math.random() - 0.5) * 1.5)
    );
    // 11 (6 CX + 5 MB) -> 4 Motor Neurons
    this.wToMotor = Array.from({ length: 4 }, () =>
      Array.from({ length: 11 }, () => (Math.random() - 0.5) * 1.5)
    );

    // Initial inductive bias: bearing input strongly guides steering
    // Motor 0 (Turn L), Motor 1 (Turn R)
    this.wToMotor[0][0] = -1.2; // if target on right, turn L is suppressed
    this.wToMotor[1][0] = 1.2;  // if target on right, turn R is promoted
    this.wToMotor[2][5] = 0.8;  // thrust forward
  }

  /**
   * Forward pass: computes biological neuron activation & motor command
   */
  public forward(sensors: SensorInputs, emotion: EmotionState): MotorOutputs {
    // 1. Prepare normalized inputs [bearing, distance, deltaDistance, eyeL, eyeR, halteres]
    const normBearing = sensors.angleToTarget / Math.PI; // -1 to +1
    const normDist = Math.min(1.0, sensors.distanceToTarget / 100);
    const normDeltaD = Math.max(-1.0, Math.min(1.0, sensors.deltaDistance * 5));
    const eyeL = sensors.eyeLeftBrightness;
    const eyeR = sensors.eyeRightBrightness;
    const gyro = sensors.halteresYawRate;

    const inputVec = [normBearing, normDist, normDeltaD, eyeL, eyeR, gyro];

    // Update sensory activations
    this.setAct('S_BEARING', Math.abs(normBearing));
    this.setAct('S_DIST', 1.0 - normDist);
    this.setAct('S_DELTA_D', Math.max(0, -normDeltaD));
    this.setAct('S_EYE_L', eyeL);
    this.setAct('S_EYE_R', eyeR);
    this.setAct('S_GYRO', Math.abs(gyro));

    // 2. Central Complex Ring Attractor
    const cxActs: number[] = [];
    const cxIds = ['CX_EPG_L', 'CX_EPG_C', 'CX_EPG_R', 'CX_FB_GOAL', 'CX_PB_SHIFT', 'CX_NO_SPEED'];
    for (let i = 0; i < 6; i++) {
      let sum = 0;
      for (let j = 0; j < 6; j++) {
        sum += inputVec[j] * this.wSensoryToCx[i][j];
      }
      // Ring attractor dynamic: non-linear tanh activation
      const act = Math.tanh(sum);
      cxActs.push(act);
      this.setAct(cxIds[i], Math.max(0, act));
    }

    // 3. Mushroom Body (Associative Learning & Neuromodulation)
    const mbActs: number[] = [];
    const mbIds = ['MB_KC_ALPHA', 'MB_PAM_DAN', 'MB_PPL1_DAN', 'MB_MBON_APPROACH', 'MB_MBON_AVOID'];
    for (let i = 0; i < 5; i++) {
      let sum = 0;
      for (let j = 0; j < 6; j++) {
        sum += cxActs[j] * this.wCxToMb[i][j];
      }
      // Modulate with Dopamine (Glück) and Octopamine (Stress)
      if (i === 1) sum += emotion.dopamine * 2.0; // PAM Dopamine
      if (i === 2) sum += emotion.octopamine * 2.0; // PPL1 Aversion

      const act = 1.0 / (1.0 + Math.exp(-sum * 2)); // Sigmoid
      mbActs.push(act);
      this.setAct(mbIds[i], act);
    }

    // 4. Combined Hidden -> Descending Motor Neurons
    const combinedHidden = [...cxActs, ...mbActs]; // 11 units
    const motorOuts: number[] = [];
    for (let i = 0; i < 4; i++) {
      let sum = 0;
      for (let j = 0; j < combinedHidden.length; j++) {
        sum += combinedHidden[j] * this.wToMotor[i][j];
      }
      motorOuts.push(sum);
    }

    // Motor interpretation
    const rawTurnL = Math.max(0, Math.tanh(motorOuts[0]));
    const rawTurnR = Math.max(0, Math.tanh(motorOuts[1]));
    const rawThrust = 0.5 + 0.5 * Math.tanh(motorOuts[2]); // 0.2 to 1.0
    const rawPitch = Math.tanh(motorOuts[3]);

    this.setAct('DN_TURN_L', rawTurnL);
    this.setAct('DN_TURN_R', rawTurnR);
    this.setAct('DN_THRUST', rawThrust);
    this.setAct('DN_PITCH', Math.abs(rawPitch));

    // Resulting steering delta
    const turn = rawTurnR - rawTurnL;
    const thrust = Math.max(0.2, Math.min(1.0, rawThrust));

    // Record step trace for reinforcement learning
    this.recentTrace.push({
      inputs: inputVec,
      cxActs,
      motorActs: combinedHidden,
      actionTaken: [turn, thrust]
    });
    if (this.recentTrace.length > 80) this.recentTrace.shift();

    return {
      turn,
      thrust,
      pitchRate: rawPitch,
      wingAmplitude: 0.4 + thrust * 0.6
    };
  }

  private setAct(id: string, val: number) {
    const n = this.neurons.get(id);
    if (n) n.activation = Math.max(0, Math.min(1, val));
  }

  /**
   * Apply Reinforcement Learning updates using biological reward signal
   * Positive feeling (dopamine > 0) strengthens active synapses (LTP).
   * Negative feeling (distress / moving away) weakens or reverses them (LTD).
   */
  public applyRewardSignal(reward: number) {
    if (this.recentTrace.length === 0) return;

    // Plasticity learning rate
    const lr = 0.015 * Math.tanh(reward);

    // Apply to last few steps
    const sample = this.recentTrace[this.recentTrace.length - 1];
    if (!sample) return;

    // Update Motor Synapses: ΔW_ij = lr * Post_i * Pre_j * Reward
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < sample.motorActs.length; j++) {
        this.wToMotor[i][j] += lr * sample.motorActs[j];
        // Clip to avoid explosion
        this.wToMotor[i][j] = Math.max(-3, Math.min(3, this.wToMotor[i][j]));
      }
    }

    // Update Sensory -> CX
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        this.wSensoryToCx[i][j] += lr * 0.5 * sample.inputs[j];
        this.wSensoryToCx[i][j] = Math.max(-3, Math.min(3, this.wSensoryToCx[i][j]));
      }
    }
  }

  /**
   * Save best genome on new milestone
   */
  public saveBest() {
    this.bestGenome = {
      wSensoryToCx: this.wSensoryToCx.map(r => [...r]),
      wCxToMb: this.wCxToMb.map(r => [...r]),
      wToMotor: this.wToMotor.map(r => [...r])
    };
  }

  /**
   * Evolve weights with mutation from best genome (New generation)
   */
  public mutate(mutationRate = 0.15) {
    const base = this.bestGenome || {
      wSensoryToCx: this.wSensoryToCx,
      wCxToMb: this.wCxToMb,
      wToMotor: this.wToMotor
    };

    this.wSensoryToCx = base.wSensoryToCx.map(row =>
      row.map(w => w + (Math.random() - 0.5) * mutationRate)
    );
    this.wCxToMb = base.wCxToMb.map(row =>
      row.map(w => w + (Math.random() - 0.5) * mutationRate)
    );
    this.wToMotor = base.wToMotor.map(row =>
      row.map(w => w + (Math.random() - 0.5) * mutationRate)
    );
  }

  public resetWeights() {
    this.bestGenome = null;
    this.randomizeWeights();
    this.recentTrace = [];
  }
}
