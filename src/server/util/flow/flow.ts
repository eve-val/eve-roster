import { Resolvable } from "../async/Resolvable.js";
import { ArrayQueue } from "../collection/ArrayQueue.js";
import { PriorityQueue } from "../collection/PriorityQueue.js";
import { wrapError } from "../error.js";

/**
 * A small library for managing asynchronous pipeline code.
 *
 * This can be seen as a replacement for node's object Streams (which are
 * bulky and unwieldy). In a world where I'm not a stubborn git, we would just
 * use RxJs here, which does roughly the same thing. The shape of this library
 * is largely inspired from Kotlin flows.
 *
 * A flow is made up of a source, zero or more transforms, and finally a
 * terminal statement. For example:
 *
 * ```ts
 * await flow
 *    .of([1, 2, 3, 4])           // source
 *    .map((value) => value * 2)  // transform
 *    .collect();                 // terminal
 * ```
 *
 * The system supports full backpressure control, so large sources like files
 * or database queries will not consume excessive memory.
 */
export const flow = {
  /**
   * Returns a flow of a particular FlowSource (usually created via
   * {@link flowBuilder.source}). This is the most common way to start a flow.
   */
  from<T = never>(source: FlowSource<T>) {
    return new FlowBuilder(() => new SourceFlow(source));
  },

  /**
   * Given an array or iterable {@link source} creates a flow over those values.
   */
  of<T>(source: T[] | Iterable<T>) {
    const list = source instanceof Array ? source : Array.from(source);
    return new FlowBuilder(() => new ListFlow(list));
  },

  /**
   * Returns a flow of the values returned by {@link generator}.
   */
  fetch<T>(generator: () => Promise<T[]>): FlowBuilder<T> {
    return new FlowBuilder(() => new AsyncListFlow<T>(generator));
  },

  /**
   * Creates a flow that can have values pushed to it on-demand.
   * @param callback This function wil be called with a pushable object that
   *    can be used to push values to the flow. The flow will remain open until
   *    pushable.close() is called.
   */
  pushable<T>(callback: (pushable: PushableNode<T>) => unknown) {
    return new FlowBuilder(() => {
      const node = new PushableSourceFlow<T>();
      callback(node);
      return node;
    });
  },

  /**
   * Convenience function to define a FlowSource that can be used in other
   * flows.
   *
   * @see flow.from
   */
  defineSource<T = never>(
    builder: (node: SourceMethods<T>) => SourceImpl,
  ): FlowSource<T> {
    return builder;
  },

  /**
   * Convenience function to define a custom FlowTransform that can be used in
   * other flows.
   *
   * @see FlowBuilder.transform
   */
  defineTransform<T = never, U = never>(
    builder: (node: TransformMethods<U>) => TransformImpl<T>,
  ): FlowTransform<T, U> {
    return builder;
  },
};

class FlowBuilder<T> {
  constructor(private factory: () => ProduceNode<T>) {}

  /**
   * Returns a flow that is the result of calling {@link transformer} on each
   * incoming value.
   */
  map<U>(transformer: (value: T) => Eventually<U>): FlowBuilder<U> {
    return this.pipe(() => new MapFlow<T, U>(transformer));
  }

  /**
   * Passes through all incoming values for which {@link predicate} returns
   * true.
   */
  filter(predicate: (value: T) => Eventually<boolean>): FlowBuilder<T> {
    return this.pipe(() => new FilterFlow<T>(predicate));
  }

  /**
   * A more general-purpose version of map and filter, this method can be used
   * to emit multiple (or zero) values in response to each incoming value.
   */
  transform<U = never>(transform: FlowTransform<T, U>) {
    return this.pipe(() => new TransformFlow<T, U>(transform));
  }

  /**
   * Executes {@link handler} on each incoming value, but emits the original
   * value.
   */
  observe(handler: (value: T) => Eventually<unknown>) {
    return this.pipe(() => new ForEachFlow<T>(handler));
  }

  /**
   * Like {@link map}, but executes {@link transformer} in parallel, up to
   * {@link maxParallelism}. Transformed values are emitted in the same order
   * as they were received.
   */
  mapParallel<U>(
    maxParallelism: number,
    transformer: (value: T) => Promise<U>,
  ) {
    return this.pipe(() => new MapParallelFlow(maxParallelism, transformer));
  }

  /**
   * Executes {@link handler} once, as soon as the first value is received.
   * After the handler completes, passes through all incoming values (including
   * the first one).
   */
  once(handler: () => Eventually<unknown>) {
    return this.pipe(() => new OnceFlow(handler));
  }

  /**
   * Passes through all incoming values until the flow runs dry, at which point
   * executes {@link handler} and closes the flow.
   */
  finally(handler: () => Eventually<unknown>) {
    return this.pipe(() => new FinallyFlow(handler));
  }

  /**
   * Passes through all incoming values until {@link predicate} returns false,
   * at which point the flow is closed and no further values will be emitted.
   */
  while(predicate: (value: T) => Eventually<boolean>) {
    return this.pipe(() => new WhileFlow(predicate));
  }

  /**
   * Waits until it receives {@link batchSize} values and then emits them in
   * a block (as an array). Partial blocks are possible at the end of a flow.
   */
  batch(batchSize: number) {
    return this.pipe(() => new BatchFlow(batchSize));
  }

  /**
   * Breaks apart any incoming values that are arrays and emits each element
   * individually. Performs this process recursively, so, for example,
   * [1, [[2, 3], 4]] will become individual emits of 1, 2, 3, and 4.
   */
  flatten() {
    return this.pipe(() => new FlattenFlow());
  }

  /**
   * Reorders incoming values based on {@link comparator} using a priority
   * queue. This transform has its limits; it only guarantees that items within
   * {@link windowSize} items of each other will be properly ordered. Because of
   * this, think of it as "smoothing" the input stream rather than truly
   * reordering.
   */
  smooth(windowSize: number, comparator: (a: T, b: T) => number) {
    return this.pipe(() => new ReorderingFlow(windowSize, comparator));
  }

  /**
   * Runs multiple instances of {@link block} subflows in parallel, passing
   * incoming values to whichever flow is available. Runs at most
   * {@link maxParallelism} flows at once.
   */
  parallelize<U>(
    maxParallelism: number,
    block: (flow: FlowBuilder<T>) => FlowBuilder<U>,
  ) {
    return this.pipe(() => new ParallelizeFlow(maxParallelism, block));
  }

  /**
   * On flow construction, executes {@link block} and connects the resulting
   * flow to the upstream. The primary purpose of this function is to allow
   * flows created by {@link block} to store and reference data in its closure.
   */
  block<U>(block: (flow: FlowBuilder<T>) => FlowBuilder<U>) {
    return new FlowBuilder<U>(() => {
      return block(this).build();
    });
  }

  /**
   * Executes {@link builder}, passing in this flow. The end result is that
   * builder will append its flow to this one.
   */
  append<U>(builder: (fb: FlowBuilder<T>) => FlowBuilder<U>): FlowBuilder<U> {
    return builder(this);
  }

  private pipe<U>(builder: () => TransformNode<T, U>) {
    return new FlowBuilder(() => {
      const flow = builder();
      const upstream = this.build();
      flow.connectUpstream(upstream);
      return flow;
    });
  }

  private build() {
    return this.factory();
  }

  /**
   * Builds and executes the flow. This method (or another terminal method)
   * must be called before the flow will begin to flow.
   *
   * @param valueHandler An optional observer to which is passed all incoming
   *    values. Equivalent to calling .observe().run().
   * @returns A Promise that is resolved when the flow finishes.
   */
  run(valueHandler?: (value: T) => Eventually<unknown>) {
    const collectNode = new TerminalFlow(valueHandler);
    collectNode.connectUpstream(this.build());

    return Promise.resolve()
      .then(() => collectNode.init())
      .then((source) => {
        source.start();
        return collectNode.promise;
      })
      .catch((err) => {
        throw err;
      });
  }

  /**
   * Similar to {@link run}, but returns a list of all produces values.
   */
  async collect(): Promise<T[]> {
    const list: T[] = [];
    await this.run((value) => {
      list.push(value);
    });
    return list;
  }
}

export type Eventually<T> = T | Promise<T>;

export interface PushableNode<T> {
  push(value: T): boolean;
  close(): void;
  setOnReadyListener(listener: () => void): void;
}

abstract class SourceNode<U> implements HeadNode<U> {
  private downstream!: ConsumeNode<U>;
  private sealed = false;
  private isReading = false;
  private isDownstreamReady = true;

  protected abstract onRead(): Eventually<void>;

  protected onInit(): Eventually<void> {}
  protected onSealed(_reason: SealReason): void {}

  setDownstream(downstream: ConsumeNode<U>): void {
    if (this.downstream != null) {
      throw new Error(`Downstream already set`);
    }
    this.downstream = downstream;
  }

  init(): Eventually<HeadNode<unknown>> {
    // Don't need to wrap in a try; we're protected by downstream try
    const result = this.onInit();

    if (result instanceof Promise) {
      return result.then(() => this);
    } else {
      return this;
    }
  }

  start(): void {
    try {
      this.startReading();
    } catch (err) {
      this.seal(sealReasonError(wrapError(err)), "down");
    }
  }

  onDownstreamReady(): void {
    this.isDownstreamReady = true;
    this.startReading();
  }

  seal(reason: SealReason, direction: SealDirection): void {
    if (this.sealed) {
      return;
    }
    this.sealed = true;
    queueMicrotask(() => this.onSealed(reason));
    if (direction == "down" || direction == "both") {
      this.downstream.seal(reason, "down");
    }
  }

  emit(value: U): boolean {
    if (this.sealed) {
      return false;
    }
    this.isDownstreamReady = this.downstream.pushValue(value);
    return this.isDownstreamReady;
  }

  throw(reason: unknown) {
    this.seal(sealReasonError(wrapError(reason)), "both");
  }

  /*
   * Indicates that the code has successfully finished emitting values and will
   * not emit any more (usually because it has exhausted its backing resource).
   * Causes this flow to become SEALED.
   */
  close() {
    this.seal(SEAL_REASON_DRY, "up");
    this.downstream.onParentDry();
  }

  private startReading() {
    if (this.isReading) {
      return;
    }

    while (this.isDownstreamReady && !this.sealed) {
      this.isReading = true;
      const result = this.onRead();
      if (result instanceof Promise) {
        result
          .then(() => {
            this.isReading = false;
            this.startReading();
          })
          .catch((err) => {
            this.throw(err);
          });
        break;
      } else {
        this.isReading = false;
      }
    }
  }
}

class SourceFlow<T> extends SourceNode<T> {
  private impl: SourceImpl;

  constructor(implBuilder: (node: SourceMethods<T>) => SourceImpl) {
    super();

    this.impl = implBuilder(this);
  }

  protected onRead(): Eventually<void> {
    return this.impl.onRead();
  }

  protected onInit(): Eventually<void> {
    return this.impl.onInit?.();
  }

  protected onSealed(reason: SealReason): void {
    this.impl.onSealed?.(reason);
  }
}

interface SourceImpl {
  onRead(): Eventually<void>;

  onInit?(): Eventually<void>;
  onSealed?(reason: SealReason): void;
}

interface SourceMethods<T> {
  emit(value: T): boolean;
  close(): void;
  throw(reason: unknown): void;
}

export type FlowSource<T> = (node: SourceMethods<T>) => SourceImpl;

abstract class TransformNode<T, U>
  implements ProduceNode<U>, ConsumeNode<T>, TransformMethods<U>
{
  private buffer: ArrayQueue<T> | null = null;
  private isSealed = false;
  private isDownstreamReady = true;
  private isNodeReady = true;
  private isParentDry = false;
  private isDrainingBuffer = false;

  protected _debug = false;

  private get state() {
    if (this.isSealed) {
      return NodeState.SEALED;
    } else if (
      !this.isDownstreamReady ||
      !this.isNodeReady ||
      (this.buffer != null && this.buffer.size() > 0)
    ) {
      return NodeState.BUSY;
    } else {
      return NodeState.READY;
    }
  }

  private upstream!: ProduceNode<T>;
  private downstream!: ConsumeNode<U>;

  connectUpstream(upstream: ProduceNode<T>) {
    if (this.upstream != null) {
      throw new Error("Upstream already connected");
    }
    this.upstream = upstream;
    this.upstream.setDownstream(this);
  }

  // Implementation
  abstract onValue(value: T): Eventually<void>;

  // Protected API
  emit(value: U): boolean {
    if (this.isSealed) {
      return false;
    }

    this.isDownstreamReady = this.downstream.pushValue(value);
    return this.isDownstreamReady;
  }

  close(): void {
    if (!this.isSealed) {
      this.seal(SEAL_REASON_DRY, "up");
      this.downstream.onParentDry();
    }
  }

  throw(err: unknown) {
    this.seal(sealReasonError(wrapError(err)), "both");
  }

  // Lifecycle events
  onInit(): Eventually<void> {}
  onFulfilled(): OnFulfilledResult {
    return FULFILLED_ACTION_SEAL;
  }
  onSealed(_reason: SealReason): void {}

  // Private API
  seal(reason: SealReason, direction: SealDirection): void {
    if (this.isSealed) {
      return;
    }

    this.isSealed = true;
    this.buffer?.clear();
    queueMicrotask(() => this.onSealed(reason));

    if (direction == "up" || direction == "both") {
      this.upstream.seal(reason, direction);
    }
    if (direction == "down" || direction == "both") {
      this.downstream.seal(reason, direction);
    }
  }

  init(): Eventually<HeadNode<unknown>> {
    return unwrapEventually(
      () => this.upstream.init(),
      (headNode) =>
        unwrapEventually(
          () => this.onInit(),
          () => {
            this.debug(() => `[${this.constructor.name}] Initialized`);
            return headNode;
          },
        ),
    );
  }

  setDownstream(downstream: ConsumeNode<U>): void {
    if (this.downstream != null) {
      throw new Error(`Downstream already set`);
    }
    this.downstream = downstream;
  }

  onDownstreamReady(): void {
    this.isDownstreamReady = true;
    this.processBuffer();
  }

  pushValue(value: T): boolean {
    switch (this.state) {
      case NodeState.READY:
        this.processValue(value);
        return this.state == NodeState.READY;
      case NodeState.BUSY:
        this.debug(() => `BUFFERING ${JSON.stringify(value)}`);
        this.pushPendingValue(value);
        return false;
      case NodeState.SEALED:
        this.debug(() => `IGNORING ${JSON.stringify(value)} (already sealed)`);
        return false;
    }
  }

  onParentDry(): void {
    this.isParentDry = true;
    if (!this.isDrainingBuffer) {
      this.processBuffer();
    }
  }

  private processBuffer() {
    if (this.isDrainingBuffer) {
      throw new Error("Reentrant call");
    }

    // Consider the performance implications of waiting on the downstream here.
    // It may make more sense to just drain everything into the downstream
    // rather than wait on it. Doing so probably gives us a bit more "flex" in
    // terms of smoothing out responsive times (upstream doesn't have to wait
    // for us to restart our transform before getting the next value). However,
    // it does so at increased buffer memory size. Since we "push" the pending
    // values downstream, any bottleneck of size N is likely to be copied for
    // each downstream node.
    if (this.isSealed || !this.isNodeReady || !this.isDownstreamReady) {
      this.debug(
        () =>
          `Skipping buffer drain isSealed=${this.isSealed}` +
          ` isNodeReady=${this.isNodeReady}` +
          ` isDownstreamReady=${this.isDownstreamReady}`,
      );
      return;
    }

    this.isDrainingBuffer = true;

    while (this.buffer != null && this.buffer.size() > 0) {
      this.processValue(this.buffer.dequeue());
      if (!this.isNodeReady) {
        this.isDrainingBuffer = false;
        return;
      }
    }

    // Buffer is now empty

    if (this.isParentDry) {
      const result = this.onFulfilled();
      if (result instanceof Promise) {
        result.then(
          () => this.close(),
          (err) => this.throw(err),
        );
      } else if (result == FULFILLED_ACTION_SEAL) {
        this.close();
      }
    } else if (this.isDownstreamReady) {
      this.isDrainingBuffer = false;
      this.upstream.onDownstreamReady();
    }
  }

  private pushPendingValue(value: T) {
    if (this.buffer == null) {
      this.buffer = new ArrayQueue<T>(4);
    }
    this.buffer.enqueue(value);
  }

  private processValue(value: T) {
    if (!this.isNodeReady) {
      throw new Error("Node not ready");
    }
    this.isNodeReady = false;

    this.debug(() => `RECEIVED ${JSON.stringify(value)}`);
    const result = this.onValue(value);

    if (result instanceof Promise) {
      this.debug(() => `AWAITING-ASYNC ${JSON.stringify(value)}`);
      result
        .then(() => {
          this.debug(() => `FINISHED-ASYNC ${JSON.stringify(value)}`);
          this.isNodeReady = true;
          this.processBuffer();
        })
        .catch((err) => this.throw(err));
    } else {
      this.debug(() => `FINISHED-SYNC ${JSON.stringify(value)}`);
      this.isNodeReady = true;
    }
  }

  protected debug(printer: () => string) {
    if (this._debug) {
      console.log(`[${this.constructor.name}]`, printer());
    }
  }
}

class TransformFlow<T, U> extends TransformNode<T, U> {
  private impl: TransformImpl<T>;

  constructor(implBuilder: (node: TransformMethods<U>) => TransformImpl<T>) {
    super();
    this.impl = implBuilder(this);
  }

  onValue(value: T): Eventually<void> {
    return this.impl.onValue(value);
  }

  onInit(): Eventually<void> {
    return this.impl.onInit?.();
  }

  onFulfilled(): OnFulfilledResult {
    return this.impl.onFulfilled?.() ?? FULFILLED_ACTION_SEAL;
  }

  onSealed(reason: SealReason): void {
    this.impl.onSealed?.(reason);
  }
}

export interface TransformImpl<T> {
  onValue(value: T): Eventually<void>;

  onInit?(): Eventually<void>;
  onFulfilled?(): OnFulfilledResult;
  onSealed?(reason: SealReason): void;
}

export interface TransformMethods<T> {
  emit(value: T): boolean;
  throw(err: Error): void;
  close(): void;
}

export type FlowTransform<T, U> = (
  node: TransformMethods<U>,
) => TransformImpl<T>;

interface BaseNode {
  seal(reason: SealReason, direction: SealDirection): void;
}

interface ProduceNode<U> extends BaseNode {
  init(): HeadNode<unknown> | Promise<HeadNode<unknown>>;
  setDownstream(downstream: ConsumeNode<U>): void;
  onDownstreamReady(): void;
}

interface ConsumeNode<U> extends BaseNode {
  pushValue(value: U): boolean;
  onParentDry(): void;
}

interface HeadNode<T> extends ProduceNode<T> {
  start(): void;
}

type SealDirection = "up" | "down" | "both";

export type SealReason =
  | {
      type: "dry";
    }
  | {
      type: "error";
      error: Error;
    };

const SEAL_REASON_DRY = {
  type: "dry" as const,
};

function sealReasonError(error: Error): SealReason {
  return {
    type: "error",
    error,
  };
}

const FULFILLED_ACTION_SEAL: unique symbol = Symbol();
const FULFILLED_ACTION_IGNORE: unique symbol = Symbol();

type OnFulfilledResult =
  | typeof FULFILLED_ACTION_SEAL
  | typeof FULFILLED_ACTION_IGNORE
  | Promise<void>;

enum NodeState {
  READY,
  BUSY,
  SEALED,
}

class MapFlow<T, U> extends TransformNode<T, U> {
  constructor(private transformer: (value: T) => Eventually<U>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    const result = this.transformer(value);
    if (result instanceof Promise) {
      return result.then((value) => {
        this.emit(value);
      });
    } else {
      this.emit(result);
    }
  }
}

class FilterFlow<T> extends TransformNode<T, T> {
  constructor(private predicate: (value: T) => boolean | Promise<boolean>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    const result = this.predicate(value);
    if (result instanceof Promise) {
      return result.then((verdict) => {
        if (verdict) {
          this.emit(value);
        }
      });
    } else {
      if (result) {
        this.emit(value);
      }
    }
  }
}

class ForEachFlow<T> extends TransformNode<T, T> {
  constructor(private handler: (value: T) => Eventually<unknown>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    const result = this.handler(value);
    if (result instanceof Promise) {
      return result.then(() => {
        this.emit(value);
      });
    } else {
      this.emit(value);
    }
  }
}

class OnceFlow<T> extends TransformNode<T, T> {
  private initialized = false;

  constructor(private initializer: () => Eventually<unknown>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    if (this.initialized) {
      this.emit(value);
    } else {
      const result = this.initializer();
      if (result instanceof Promise) {
        return result.then(() => {
          this.initialized = true;
          this.emit(value);
        });
      } else {
        this.initialized = true;
        this.emit(value);
      }
    }
  }
}

class FinallyFlow<T> extends TransformNode<T, T> {
  constructor(private handler: () => Eventually<unknown>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    this.emit(value);
  }

  onFulfilled(): OnFulfilledResult {
    const result = this.handler();
    if (result instanceof Promise) {
      return result;
    } else {
      return FULFILLED_ACTION_SEAL;
    }
  }
}

class WhileFlow<T> extends TransformNode<T, T> {
  constructor(private gate: (value: T) => Eventually<boolean>) {
    super();
  }

  onValue(value: T): Eventually<void> {
    const result = this.gate(value);
    if (result instanceof Promise) {
      return result.then((continueFlowing) => {
        if (continueFlowing) {
          this.emit(value);
        } else {
          this.close();
        }
      });
    } else {
      if (result) {
        this.emit(value);
      } else {
        this.close();
      }
    }
  }
}

class BatchFlow<T> extends TransformNode<T, T[]> {
  private batchBuffer: T[] = [];

  constructor(private batchSize: number) {
    super();
  }

  onValue(value: T): Eventually<void> {
    this.batchBuffer.push(value);
    if (this.batchBuffer.length >= this.batchSize) {
      this.emitBuffer();
    }
  }

  onFulfilled(): OnFulfilledResult {
    if (this.batchBuffer.length > 0) {
      this.emitBuffer();
    }
    return FULFILLED_ACTION_SEAL;
  }

  private emitBuffer() {
    const tmp = this.batchBuffer;
    this.batchBuffer = [];
    this.emit(tmp);
  }
}

class FlattenFlow<T> extends TransformNode<T, FlattenRecursive<T>> {
  onValue(value: T): Eventually<void> {
    this.flattenRecursively(value);
  }

  private flattenRecursively(value: T) {
    if (value instanceof Array) {
      for (const elem of value) {
        this.flattenRecursively(elem);
      }
    } else {
      this.emit(value as any);
    }
  }
}

type FlattenRecursive<T> = T extends (infer U)[] ? FlattenRecursive<U> : T;

class ParallelizeFlow<T, U> extends TransformNode<T, U> {
  private flows: ParallelSubflow<T>[] = [];
  private readyFlows: ParallelSubflow<T>[] = [];
  private sealedCount = 0;
  private slotsAvailableResolvable: Resolvable<void> | null = null;

  constructor(
    private maxParallelism: number,
    private blockBuilder: (fb: FlowBuilder<T>) => FlowBuilder<U>,
  ) {
    super();
  }

  onValue(value: T): Eventually<void> {
    const subflow = this.getNextReadyFlow();
    this.debug(() => `Sending ${value} to pipe ${subflow.index}`);
    const ready = subflow.head.push(value);
    if (ready) {
      this.readyFlows.push(subflow);
    }
    if (
      this.readyFlows.length == 0 &&
      this.flows.length >= this.maxParallelism
    ) {
      this.debug(() => "Pipes full, waiting for one to finish");
      this.slotsAvailableResolvable = new Resolvable<void>();
      return this.slotsAvailableResolvable.promise;
    } else {
      return;
    }
  }

  onFulfilled(): OnFulfilledResult {
    for (const subflow of this.flows) {
      subflow.head.close();
    }
    // We'll handle closing things ourselves
    return FULFILLED_ACTION_IGNORE;
  }

  private buildSubflow(blockBuilder: (fb: FlowBuilder<T>) => FlowBuilder<U>) {
    const index = this.flows.length;
    let subflow!: ParallelSubflow<T>;
    const flowPromise = flow
      .pushable<T>((pushable) => {
        subflow = {
          head: pushable,
          index: index,
        };
      })
      .append(blockBuilder)
      .run((value) => {
        this.emit(value);
      });

    subflow.head.setOnReadyListener(() => {
      this.markFlowAsReady(subflow, index);
    });

    flowPromise.then(
      () => {
        this.debug(
          () => `Pipe ${index} finished, sealedCount=${this.sealedCount}`,
        );
        this.sealedCount++;
        if (this.sealedCount >= this.flows.length) {
          this.debug(() => "All pipes finished, closing...");
          this.close();
        }
      },
      (err) => {
        this.throw(err);
      },
    );

    this.debug(() => `Creating pipe ${index}`);

    this.flows.push(subflow);

    return subflow;
  }

  private getNextReadyFlow() {
    if (this.readyFlows.length > 0) {
      return this.readyFlows.pop()!;
    } else {
      if (this.flows.length >= this.maxParallelism) {
        throw new Error("Exceeded maxParallelism");
      }
      return this.buildSubflow(this.blockBuilder);
    }
  }

  private markFlowAsReady(head: ParallelSubflow<T>, index: number) {
    this.debug(
      () =>
        `Pipe ${index} finished, pushing to ready index ` +
        `${this.readyFlows.length}`,
    );
    this.readyFlows.push(head);
    if (this.readyFlows.length == 1) {
      this.debug(() => "...first pipe available, signaling ready");
      this.signalReady();
    }
  }

  private signalReady() {
    const promise = this.slotsAvailableResolvable;
    this.slotsAvailableResolvable = null;
    if (promise == null) {
      this.throw(new Error("Parallel transform waiting to be ready"));
      // TODO: Throw really does need to throw (but probably not throwInternal)
      return;
    } else {
      promise.resolve();
    }
  }
}

interface ParallelSubflow<T> {
  index: number;
  head: PushableNode<T>;
}

class MapParallelFlow<T, U> extends TransformNode<T, U> {
  private queue;
  private maxQueueSize: number;

  private activeJobCount = 0;
  private readyForMoreValuesResolvable: Resolvable<void> | null = null;
  private isFulfilled = false;

  constructor(
    private maxParallelism: number,
    private transformer: (value: T) => Promise<U>,
  ) {
    super();

    this.maxQueueSize = maxParallelism * 2;

    this.queue = new ArrayQueue<U | typeof PENDING_VALUE>(
      this.maxQueueSize,
      false,
    );
  }

  override onValue(value: T): Eventually<void> {
    this.activeJobCount++;
    const position = this.queue.enqueue(PENDING_VALUE);
    this.transformer(value)
      .then((value) => {
        this.activeJobCount--;
        this.queue.set(position, value);
        this.drainQueue();
      })
      .catch((e) => {
        this.activeJobCount--;
        this.throw(e);
      });

    if (this.readyForMoreValuesResolvable != null) {
      throw new Error(`Received a value when still waiting to drain`);
    }

    if (!this.isReadyForMoreValues()) {
      this.readyForMoreValuesResolvable = new Resolvable<void>();
      return this.readyForMoreValuesResolvable.promise;
    } else {
      return;
    }
  }

  onFulfilled(): OnFulfilledResult {
    this.isFulfilled = true;
    if (this.queue.size() > 0) {
      return FULFILLED_ACTION_IGNORE;
    } else {
      return FULFILLED_ACTION_SEAL;
    }
  }

  private drainQueue() {
    while (this.queue.size() > 0 && this.queue.peek() != PENDING_VALUE) {
      this.emit(this.queue.dequeue() as U);
    }
    if (
      this.readyForMoreValuesResolvable != null &&
      this.isReadyForMoreValues()
    ) {
      this.readyForMoreValuesResolvable.resolve();
      this.readyForMoreValuesResolvable = null;
    }
    if (this.isFulfilled && this.queue.size() == 0) {
      this.close();
    }
  }

  private isReadyForMoreValues() {
    return (
      this.activeJobCount < this.maxParallelism &&
      this.queue.size() < this.maxQueueSize
    );
  }
}

const PENDING_VALUE: unique symbol = Symbol();

class ReorderingFlow<T> extends TransformNode<T, T> {
  private queue: PriorityQueue<T>;

  constructor(
    private maxSize: number,
    comparator: (left: T, right: T) => number,
  ) {
    super();
    this.queue = new PriorityQueue<T>(comparator);
  }

  onValue(value: T): Eventually<void> {
    this.queue.enqueue(value);
    if (this.queue.size > this.maxSize) {
      this.emit(this.queue.dequeue());
    }
  }

  onFulfilled(): OnFulfilledResult {
    while (this.queue.size > 0) {
      this.emit(this.queue.dequeue());
    }
    return FULFILLED_ACTION_SEAL;
  }
}

class PushableSourceFlow<T> implements HeadNode<T>, PushableNode<T> {
  private downstream!: ConsumeNode<T>;
  private started = false;
  private sealed = false;
  private _ready = false;
  private readyListener: (() => void) | null = null;

  private preStartValues: T[] | null = [];

  get ready() {
    return this._ready;
  }

  init(): Eventually<HeadNode<unknown>> {
    return this;
  }

  start(): void {
    this.started = true;
    const pending = this.preStartValues!;
    this.preStartValues = null;
    this._ready = true;
    for (const pval of pending) {
      this._ready = this.downstream.pushValue(pval);
    }
    if (this._ready && pending.length > 0) {
      this.readyListener?.();
    }
  }

  close() {
    this.seal(SEAL_REASON_DRY, "up");
    this.downstream.onParentDry();
  }

  seal(reason: SealReason, direction: SealDirection): void {
    this.sealed = true;
    if (direction == "down" || direction == "both") {
      this.downstream.seal(reason, direction);
    }
  }

  setDownstream(downstream: ConsumeNode<T>): void {
    this.downstream = downstream;
  }

  onDownstreamReady(): void {
    this._ready = true;
    this.readyListener?.();
  }

  push(value: T) {
    if (this.sealed) {
      return false;
    }
    if (!this.started) {
      this.preStartValues!.push(value);
    } else {
      this._ready = this.downstream.pushValue(value);
    }

    return this._ready;
  }

  setOnReadyListener(listener: () => void) {
    this.readyListener = listener;
  }
}

class ListFlow<T> extends SourceNode<T> {
  private index = 0;

  constructor(private readonly source: T[]) {
    super();
  }

  protected onRead(): void {
    if (this.index < this.source.length) {
      const value = this.source[this.index];
      this.index++;
      this.emit(value);
    } else {
      this.close();
    }
  }
}

class AsyncListFlow<T> extends SourceNode<T> {
  private index = 0;
  private collection!: T[];

  constructor(private generator: () => Promise<T[]>) {
    super();
  }

  override onInit(): void {
    this.generator().then(
      (arr) => {
        this.collection = arr;
      },
      (err) => {
        this.throw(err);
      },
    );
  }

  protected onRead(): void {
    if (this.index < this.collection.length) {
      const value = this.collection[this.index];
      this.index++;
      this.emit(value);
    } else {
      this.close();
    }
  }
}

class TerminalFlow<T> extends TransformNode<T, never> {
  private _promise: Promise<void>;
  private resolve!: (value: void | PromiseLike<void>) => void;
  private reject!: (reason?: any) => void;

  constructor(private valueHandler?: (value: T) => unknown | Promise<unknown>) {
    super();

    this._promise = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.setDownstream(FAKE_TERMINAL_NODE);
  }

  get promise() {
    return this._promise;
  }

  override onValue(value: T): Eventually<void> {
    if (this.valueHandler == null) {
      return;
    }
    return this.valueHandler(value) as Eventually<void>;
  }

  override onSealed(reason: SealReason): void {
    if (reason.type == "error") {
      this.reject(reason.error);
    } else {
      this.resolve();
    }
  }
}

const FAKE_TERMINAL_NODE: ConsumeNode<never> = {
  pushValue(_value) {
    return true;
  },

  seal(_reason, _direction) {
    // Do nothing
  },

  onParentDry: function (): void {
    // Do nothing
  },
};

function unwrapEventually<T, U>(
  run: () => T | Promise<T>,
  handler: (value: T) => U,
) {
  const result = run();
  if (result instanceof Promise) {
    return result.then(handler) as Promise<Awaited<U>>;
  } else {
    return handler(result);
  }
}
