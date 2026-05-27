import { ArrayUtil } from '../../util/array-util';
import { compressAsync, decompressAsync } from '../../util/compress';
import { MessagePack } from '../../util/message-pack';
import { setZeroTimeout } from '../../util/zero-timeout';
import { Connection, ConnectionCallback } from '../connection';
import { IPeerContext, PeerContext } from '../peer-context';
import { SkyWayDataStream } from './skyway-data-stream';
import { SkyWayDataStreamList } from './skyway-data-stream-list';
import { SkyWayFacade } from './skyway-facade';

type PeerId = string;

interface DataContainer {
  data: Uint8Array;
  peers?: string[];
  ttl: number;
  isCompressed?: boolean;
}

export class SkyWayConnection implements Connection {
  get peerId(): string { return this.peer.peerId; }
  get peerIds(): string[] { return this.streams.peerIds; }

  get peer(): PeerContext { return this.skyWay.peer; }
  get peers(): PeerContext[] { return this.streams.peers; }
  get peerContext(): IPeerContext { return this.skyWay.peer; }
  get peerContexts(): IPeerContext[] { return this.streams.peers; }

  readonly callback: ConnectionCallback = new ConnectionCallback();
  bandwidthUsage: number = 0;

  private readonly skyWay: SkyWayFacade = new SkyWayFacade();
  private readonly streams: SkyWayDataStreamList = new SkyWayDataStreamList();

  private listAllPeersCache: PeerId[] = [];
  private httpRequestInterval: number = performance.now() + 500;

  private outboundQueue: Promise<any> = Promise.resolve();
  private inboundQueue: Promise<any> = Promise.resolve();

  private readonly trustedPeerIds: Set<PeerId> = new Set();
  private readonly relayingPeerIds: Map<string, string[]> = new Map();
  private readonly maybeUnavailablePeerIds: Set<string> = new Set();

  setApiKey(key: string): void { /* SkyWay2023 uses backend auth, no API key needed */ }

  setBackendUrl(url: string): void {
    this.skyWay.url = url;
  }

  open(userId?: string)
  open(userId: string, roomId: string, roomName: string, password: string)
  open(...args: any[]) {
    console.log('open', args);
    let peer: PeerContext;
    if (args.length === 0) {
      peer = PeerContext.create(PeerContext.generateId());
    } else if (args.length === 1) {
      peer = PeerContext.create(args[0]);
    } else {
      peer = PeerContext.create(args[0], args[1], args[2], args[3]);
    }
    this.trustedPeerIds.clear();
    this.openSkyWay(peer);
  }

  close() {
    this.disconnectAll();
    this.skyWay.close();
  }

  connect(peerId: string): boolean {
    if (!this.peer.isRoom) {
      console.warn('connect() is Fail. ルーム接続のみ可能');
      let errorType = 'udonarium-unsupported';
      let errorMessage = 'SkyWay(2023)を使用する場合、プライベート接続は利用できません。ルーム接続機能を利用してください。';
      if (this.callback.onError) this.callback.onError(this.peer.peerId, errorType, errorMessage, {});
      return false;
    }

    if (!this.shouldConnect(peerId)) return false;

    console.log(`connect() ${peerId}`);
    let peer = PeerContext.parse(peerId);
    this.connectStream(SkyWayDataStream.createSubscription(this.skyWay, peer));
    return true;
  }

  private shouldConnect(peerId: string): boolean {
    if (!this.skyWay.isOpen) {
      console.log('connect() is Fail. IDが割り振られるまで待てや');
      return false;
    }

    if (this.peerId === peerId) {
      console.log('connect() is Fail. ' + peerId + ' is me.');
      return false;
    }

    if (this.peerIds.includes(peerId)) {
      console.log('connect() is Fail. <' + peerId + '> is already connecting.');
      return false;
    }

    if (peerId && peerId.length && peerId !== this.peerId) return true;
    return false;
  }

  disconnect(peerId: string): boolean {
    let stream = this.streams.find(peerId);
    if (!stream) return false;
    this.disconnectStream(stream);
    return true;
  }

  disconnectAll() {
    for (let peer of this.peers) {
      this.disconnect(peer.peerId);
    }
  }

  send(data: any, sendTo?: string) {
    if (this.peers.length < 1) return;
    let container: DataContainer = {
      data: MessagePack.encode(data),
      ttl: 1
    }

    let byteLength = container.data.byteLength;
    this.bandwidthUsage += byteLength;
    this.outboundQueue = this.outboundQueue.then(() => new Promise<void>((resolve) => {
      setZeroTimeout(async () => {
        if (1 * 1024 < container.data.byteLength && Array.isArray(data) && 1 < data.length) {
          let compressed = await compressAsync(container.data);
          if (compressed.byteLength < container.data.byteLength) {
            container.data = compressed;
            container.isCompressed = true;
          }
        }
        if (sendTo) {
          this.sendUnicast(container, sendTo);
        } else {
          this.sendBroadcast(container);
        }
        this.bandwidthUsage -= byteLength;
        return resolve();
      });
    }));
  }

  private sendUnicast(container: DataContainer, sendTo: string) {
    container.ttl = 0;
    let stream = this.streams.find(sendTo);
    if (stream && stream.open) stream.send(container);
  }

  private sendBroadcast(container: DataContainer) {
    for (let stream of this.streams) {
      if (stream.open) stream.send(container);
    }
  }

  async listAllPeers(): Promise<string[]> {
    let now = performance.now();
    if (now < this.httpRequestInterval) {
      console.warn('httpRequestInterval... ' + (this.httpRequestInterval - now));
    } else {
      this.httpRequestInterval = now + 10000;
      this.listAllPeersCache = await this.skyWay.listAllPeers();
    }
    return this.listAllPeersCache;
  }

  private async openSkyWay(peer: IPeerContext) {
    if (this.skyWay.context) {
      console.warn('It is already opened.');
      await this.skyWay.close();
    }

    this.skyWay.onOpen = peer => {
      console.log('skyWay onOpen', peer);
      console.log('My peer Context', this.peer);
      if (this.callback.onOpen) this.callback.onOpen(this.peer.peerId);
    };

    this.skyWay.onClose = peer => {
      console.log('skyWay onClose', peer);
      if (this.peer.isOpen) this.close();
      if (this.callback.onClose) this.callback.onClose(this.peer.peerId);
    };

    this.skyWay.onFatalError = (peer, errorType, errorMessage, errorObject) => {
      console.error('skyWay onFatalError', errorObject);
      if (this.peer.isOpen) {
        this.close();
        if (this.callback.onClose) this.callback.onClose(this.peer.peerId);
      }
      if (this.callback.onError) this.callback.onError(this.peer.peerId, errorType, errorMessage, errorObject);
    };

    this.skyWay.onSubscribed = (peer, subscription) => {
      console.log(`skyWay onSubscribed ${peer.peerId}`);
      let stream = SkyWayDataStream.createPublication(this.skyWay, peer);
      this.connectStream(stream);
    };

    this.skyWay.onRoomRestore = (peer) => {
      console.log(`skyWay onRoomRestore ${peer.peerId}`);
      for (let peerId of this.trustedPeerIds) {
        this.disconnect(peerId);
        this.connect(peerId);
      }
    };

    await this.skyWay.open(peer);
    return;
  }

  private connectStream(stream: SkyWayDataStream) {
    if (this.streams.add(stream) == null) return;
    console.log(`openStream ${stream.peer.peerId}`);

    this.trustedPeerIds.delete(stream.peer.peerId);
    this.maybeUnavailablePeerIds.add(stream.peer.peerId);

    stream.on('data', data => {
      this.onData(stream, data);
    });
    stream.on('open', () => {
      this.trustedPeerIds.add(stream.peer.peerId);
      this.maybeUnavailablePeerIds.delete(stream.peer.peerId);
      this.notifyPeerList();
      if (this.callback.onConnect) this.callback.onConnect(stream.peer.peerId);
    });
    stream.on('close', () => {
      this.disconnectStream(stream);
    });
    stream.on('error', () => {
      this.disconnectStream(stream);
    });
    stream.on('stats', async () => {
      // not implemented
    });

    stream.connect();
  }

  private disconnectStream(stream: SkyWayDataStream) {
    stream.disconnect();
    let closed = this.streams.remove(stream);

    this.relayingPeerIds.delete(stream.peer.peerId);
    this.relayingPeerIds.forEach(peerIds => {
      let index = peerIds.indexOf(stream.peer.peerId);
      if (0 <= index) peerIds.splice(index, 1);
    });
    this.notifyPeerList();
    if (closed && this.callback.onDisconnect) this.callback.onDisconnect(closed.peer.peerId);
  }

  private onData(stream: SkyWayDataStream, container: DataContainer) {
    if (container.peers && 0 < container.peers.length) this.onUpdatePeerList(stream, container.peers);
    if (0 < container.ttl) this.onRelay(stream, container);
    if (!this.callback.onData) return;
    let byteLength = container.data.byteLength;
    this.bandwidthUsage += byteLength;
    this.inboundQueue = this.inboundQueue.then(() => new Promise<void>((resolve) => {
      setZeroTimeout(async () => {
        if (!this.callback.onData) return;
        let data = container.isCompressed ? await decompressAsync(container.data) : container.data;
        this.callback.onData(stream.peer.peerId, MessagePack.decode(data));
        this.bandwidthUsage -= byteLength;
        return resolve();
      });
    }));
  }

  private onRelay(stream: SkyWayDataStream, container: DataContainer) {
    container.ttl--;

    let relayingPeerIds: string[] = this.relayingPeerIds.get(stream.peer.peerId);
    if (relayingPeerIds == null) return;

    if (container.peers && 0 < container.peers.length) {
      container.peers = this.peerIds.concat([this.peerId]);
    }

    for (let peerId of relayingPeerIds) {
      let conn = this.streams.find(peerId);
      if (conn && conn.open) {
        console.log('<' + peerId + '> 転送しなきゃ・・・');
        conn.send(container);
      }
    }
  }

  private onUpdatePeerList(stream: SkyWayDataStream, peerIds: string[]) {
    let diff = ArrayUtil.diff(this.peerIds, peerIds);
    let relayingPeerIds = diff.diff1;
    let unknownPeerIds = diff.diff2;

    this.relayingPeerIds.set(stream.peer.peerId, relayingPeerIds);

    if (unknownPeerIds.length) {
      for (let peerId of unknownPeerIds) {
        if (!this.maybeUnavailablePeerIds.has(peerId) && this.connect(peerId)) {
          console.log('auto connect to unknown Peer <' + peerId + '>');
        }
      }
    }
  }

  private notifyPeerList() {
    this.streams.refresh();
    if (this.streams.length < 1) return;
    let allPeerIds = this.peerIds.concat([this.peerId]);
    let container: DataContainer = {
      data: MessagePack.encode([]),
      peers: allPeerIds,
      ttl: 1
    }
    this.sendBroadcast(container);
  }
}
