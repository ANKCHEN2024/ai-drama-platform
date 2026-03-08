import { Server, WebSocket } from 'ws';
import http from 'http';
import { verifyToken } from '../utils/jwt';
import logger from '../utils/logger';

interface Client {
  ws: WebSocket;
  userId?: number;
  subscribedProjects: Set<number>;
}

let wss: Server;
const clients: Map<string, Client> = new Map();

interface WebSocketMessage {
  action: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
  [key: string]: any;
}

export const initWebSocketServer = (server: http.Server) => {
  wss = new Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    const client: Client = {
      ws,
      subscribedProjects: new Set(),
    };

    clients.set(clientId, client);
    logger.info(`WebSocket client connected: ${clientId}`);

    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload) {
          client.userId = payload.userId;
          logger.info(`WebSocket client authenticated: ${clientId} (user: ${payload.userId})`);
        }
      } catch (error) {
        logger.warn(`WebSocket token verification failed: ${clientId}`);
      }
    }

    ws.on('message', (data) => {
      handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      clients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket client error ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  logger.info('WebSocket server initialized');
};

const generateClientId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const handleMessage = (clientId: string, message: string) => {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    const data: WebSocketMessage = JSON.parse(message);

    switch (data.action) {
      case 'subscribe':
        handleSubscribe(client, data);
        break;
      case 'unsubscribe':
        handleUnsubscribe(client, data);
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ action: 'pong', timestamp: Date.now() }));
        break;
      default:
        logger.warn(`Unknown WebSocket action: ${data.action}`);
    }
  } catch (error) {
    logger.error(`Failed to handle WebSocket message:`, error);
  }
};

const handleSubscribe = (client: Client, data: WebSocketMessage) => {
  if (!data.channel) {
    logger.warn('Subscribe action missing channel');
    return;
  }

  if (data.channel.startsWith('project:')) {
    const projectId = parseInt(data.channel.split(':')[1]);
    if (!isNaN(projectId)) {
      client.subscribedProjects.add(projectId);
      logger.info(`Client subscribed to project ${projectId}`);
      
      client.ws.send(JSON.stringify({
        type: 'subscribed',
        channel: data.channel,
        timestamp: Date.now(),
      }));
    }
  }
};

const handleUnsubscribe = (client: Client, data: WebSocketMessage) => {
  if (!data.channel) {
    logger.warn('Unsubscribe action missing channel');
    return;
  }

  if (data.channel.startsWith('project:')) {
    const projectId = parseInt(data.channel.split(':')[1]);
    if (!isNaN(projectId)) {
      client.subscribedProjects.delete(projectId);
      logger.info(`Client unsubscribed from project ${projectId}`);
      
      client.ws.send(JSON.stringify({
        type: 'unsubscribed',
        channel: data.channel,
        timestamp: Date.now(),
      }));
    }
  }
};

export const broadcastTaskProgress = async (
  projectId: number,
  progress: {
    taskId: string;
    taskType: string;
    progress: number;
    status: string;
    message: string;
    [key: string]: any;
  }
) => {
  const message = JSON.stringify({
    type: 'progress',
    projectId,
    ...progress,
    timestamp: Date.now(),
  });

  for (const [clientId, client] of clients) {
    if (client.subscribedProjects.has(projectId) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        logger.error(`Failed to send message to client ${clientId}:`, error);
      }
    }
  }
};

export const broadcastToProject = async (
  projectId: number,
  data: Record<string, any>
) => {
  const message = JSON.stringify({
    ...data,
    projectId,
    timestamp: Date.now(),
  });

  for (const [clientId, client] of clients) {
    if (client.subscribedProjects.has(projectId) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        logger.error(`Failed to send message to client ${clientId}:`, error);
      }
    }
  }
};

export const getConnectedClients = () => {
  return clients.size;
};

export const closeWebSocketServer = async () => {
  if (wss) {
    wss.close();
    logger.info('WebSocket server closed');
  }
};
