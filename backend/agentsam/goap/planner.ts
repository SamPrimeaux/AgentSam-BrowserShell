import {
  GoapAction,
  GoapPlan,
  GoapWorldState,
  TaskContract,
} from '../../../types/agentSam';
import { getStandardGoapActions } from './actions';

/**
 * Checks if a world state satisfies the given conditions
 */
function stateSatisfies(
  state: GoapWorldState,
  conditions: Record<string, boolean>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (Boolean(state[key]) !== Boolean(value)) {
      return false;
    }
  }
  return true;
}

/**
 * Applies effects of an action to the world state, returning a new state
 */
function applyEffects(
  state: GoapWorldState,
  effects: Record<string, boolean>
): GoapWorldState {
  const next = { ...state };
  for (const [key, value] of Object.entries(effects)) {
    next[key] = value;
  }
  return next;
}

/**
 * Heuristic: counts how many goal conditions are not yet satisfied
 */
function calculateHeuristic(
  state: GoapWorldState,
  goalState: Record<string, boolean>
): number {
  let unmet = 0;
  for (const [key, value] of Object.entries(goalState)) {
    if (Boolean(state[key]) !== Boolean(value)) {
      unmet += 1;
    }
  }
  return unmet * 10;
}

interface SearchNode {
  state: GoapWorldState;
  actions: GoapAction[];
  costG: number;
  costH: number;
  costF: number;
}

/**
 * Goal-Oriented Action Planner (GOAP) based on A* search.
 * Given a TaskContract, Initial World State, and Goal State,
 * returns the optimal sequence of actions that achieves the goal.
 */
export function planGoapSequence(
  contract: TaskContract,
  customInitialState?: GoapWorldState,
  customGoalState?: Record<string, boolean>
): GoapPlan {
  const availableActions = getStandardGoapActions(contract);

  // Default initial world state
  const initialState: GoapWorldState = customInitialState || {
    env_ready: false,
    firewall_verified: false,
    auth_inventory_complete: false,
    ast_audited: false,
    consolidation_computed: false,
    svg_generated: false,
    report_sealed: false,
    d1_profiled: false,
    d1_benchmarked: false,
    mission_complete: false,
  };

  // Determine Goal State from Contract
  const isMigration = contract.rawPrompt.toLowerCase().includes('d1') || contract.rawPrompt.toLowerCase().includes('migration');
  const goalState: Record<string, boolean> = customGoalState || (isMigration
    ? { env_ready: true, d1_benchmarked: true, mission_complete: true }
    : { env_ready: true, auth_inventory_complete: true, ast_audited: true, report_sealed: true, mission_complete: true }
  );

  const startNode: SearchNode = {
    state: initialState,
    actions: [],
    costG: 0,
    costH: calculateHeuristic(initialState, goalState),
    costF: calculateHeuristic(initialState, goalState),
  };

  const openList: SearchNode[] = [startNode];
  const closedSet = new Set<string>();

  const stateKey = (st: GoapWorldState) =>
    Object.keys(st)
      .sort()
      .map(k => `${k}:${Boolean(st[k])}`)
      .join('|');

  let bestNode: SearchNode | null = null;
  const maxIterations = 200;
  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    // Pick node with lowest f = g + h
    openList.sort((a, b) => a.costF - b.costF);
    const current = openList.shift()!;

    if (stateSatisfies(current.state, goalState)) {
      bestNode = current;
      break;
    }

    const key = stateKey(current.state);
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Expand available actions
    for (const action of availableActions) {
      // Permission check against TaskContract
      const permResult = action.checkPermission(contract);
      if (!permResult.allowed) {
        continue; // Prune illegal actions
      }

      // Preconditions check
      if (!stateSatisfies(current.state, action.preconditions)) {
        continue;
      }

      const nextState = applyEffects(current.state, action.effects);
      const nextKey = stateKey(nextState);
      if (closedSet.has(nextKey)) continue;

      const nextG = current.costG + action.cost;
      const nextH = calculateHeuristic(nextState, goalState);

      openList.push({
        state: nextState,
        actions: [...current.actions, action],
        costG: nextG,
        costH: nextH,
        costF: nextG + nextH,
      });
    }
  }

  const isFeasible = bestNode !== null;
  const planActions = bestNode ? bestNode.actions : [];

  // Determine unmet preconditions if no plan found
  const unmetPreconditions: string[] = [];
  if (!isFeasible) {
    for (const [key, value] of Object.entries(goalState)) {
      if (Boolean(initialState[key]) !== Boolean(value)) {
        unmetPreconditions.push(key);
      }
    }
  }

  return {
    planId: 'plan_' + Math.random().toString(36).substring(2, 9),
    contractId: contract.id,
    actions: planActions,
    initialState,
    goalState,
    totalCost: bestNode ? bestNode.costG : 999,
    isFeasible,
    unmetPreconditions,
    createdAt: new Date().toISOString(),
  };
}
