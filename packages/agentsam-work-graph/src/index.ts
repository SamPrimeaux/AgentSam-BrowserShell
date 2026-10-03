/**
 * @inneranimalmedia/agentsam-work-graph
 * Deterministic, headless DAG work graph & timeline projections
 */

export type WorkStatus = 'backlog' | 'ready' | 'in_progress' | 'blocked' | 'completed' | 'abandoned';
export type WorkPriority = 'urgent' | 'high' | 'normal' | 'low';
export type EdgeKind = 'blocks' | 'requires' | 'produces' | 'relates';

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: WorkStatus;
  priority: WorkPriority;
  owner?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  dependencies: string[]; // ids of work items that must complete first
  producedArtifacts: string[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DependencyEdge {
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
}

export interface WorkGraphState {
  items: Map<string, WorkItem>;
  edges: DependencyEdge[];
}

export class WorkGraph {
  private items: Map<string, WorkItem> = new Map();
  private edges: DependencyEdge[] = [];

  constructor(initialItems: WorkItem[] = [], initialEdges: DependencyEdge[] = []) {
    initialItems.forEach(item => this.items.set(item.id, item));
    this.edges = [...initialEdges];
  }

  public addItem(item: WorkItem): void {
    this.items.set(item.id, item);
  }

  public getItem(id: string): WorkItem | undefined {
    return this.items.get(id);
  }

  public getAllItems(): WorkItem[] {
    return Array.from(this.items.values());
  }

  public addEdge(sourceId: string, targetId: string, kind: EdgeKind = 'requires'): void {
    const exists = this.edges.some(e => e.sourceId === sourceId && e.targetId === targetId && e.kind === kind);
    if (!exists) {
      this.edges.push({ sourceId, targetId, kind });
    }
  }

  /**
   * Topological sort to determine deterministic execution sequence
   */
  public getExecutionOrder(): WorkItem[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    this.items.forEach((_, id) => {
      inDegree.set(id, 0);
      adj.set(id, []);
    });

    this.edges.forEach(edge => {
      if (edge.kind === 'blocks' || edge.kind === 'requires') {
        const from = edge.sourceId;
        const to = edge.targetId;
        if (this.items.has(from) && this.items.has(to)) {
          adj.get(from)!.push(to);
          inDegree.set(to, (inDegree.get(to) || 0) + 1);
        }
      }
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const result: WorkItem[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(this.items.get(current)!);

      adj.get(current)?.forEach(neighbor => {
        const nextDeg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, nextDeg);
        if (nextDeg === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }

  /**
   * Calculates ready items (unblocked items that are ready to run)
   */
  public getReadyItems(): WorkItem[] {
    return Array.from(this.items.values()).filter(item => {
      if (item.status === 'completed' || item.status === 'in_progress') return false;
      const deps = item.dependencies || [];
      return deps.every(depId => {
        const dep = this.items.get(depId);
        return dep && dep.status === 'completed';
      });
    });
  }

  /**
   * Project work items onto a timeline
   */
  public getTimelineProjection(): Array<{
    itemId: string;
    title: string;
    status: WorkStatus;
    priority: WorkPriority;
    sequenceIndex: number;
    isBlocked: boolean;
  }> {
    const order = this.getExecutionOrder();
    const readySet = new Set(this.getReadyItems().map(i => i.id));

    return order.map((item, idx) => ({
      itemId: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
      sequenceIndex: idx + 1,
      isBlocked: item.status !== 'completed' && !readySet.has(item.id),
    }));
  }
}
