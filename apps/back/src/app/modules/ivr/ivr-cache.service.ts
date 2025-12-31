import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RedisClientType } from 'redis';
import { IvrNode } from './entities/ivr-node.entity';
import { IvrMedia } from '../ivr-media/entities/ivr-media.entity';

const REDIS_PREFIX = 'ivr:nodes:';
const MEDIA_PREFIX = 'ivr:media:';
const TREE_KEY = 'ivr:tree:full';
const NODE_TTL = 60 * 30; // 30 minutes
const TREE_TTL = 60 * 10; // 10 minutes for full tree

@Injectable()
export class IvrCacheService implements OnModuleInit {
  private readonly logger = new Logger(IvrCacheService.name);

  constructor(
    @InjectRepository(IvrNode) private readonly nodeRepo: Repository<IvrNode>,
    @InjectRepository(IvrMedia) private readonly mediaRepo: Repository<IvrMedia>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async onModuleInit() {
    // Pre-warm cache on startup
    await this.warmupCache();
  }

  /**
   * Pre-load frequently used nodes into cache
   */
  async warmupCache(): Promise<void> {
    try {
      this.logger.log('Warming up IVR cache...');
      
      // Load all nodes into cache
      const nodes = await this.nodeRepo.find();
      for (const node of nodes) {
        await this.cacheNode(node);
      }
      
      // Load all media
      const media = await this.mediaRepo.find();
      for (const m of media) {
        await this.cacheMedia(m);
      }
      
      // Build and cache the full tree
      await this.buildAndCacheTree();
      
      this.logger.log(`IVR cache warmed up: ${nodes.length} nodes, ${media.length} media files`);
    } catch (err) {
      this.logger.warn(`Failed to warm up IVR cache: ${err}`);
    }
  }

  /**
   * Get node by ID (with cache)
   */
  async getNodeById(id: string): Promise<IvrNode | null> {
    if (!id) return null;

    // Try cache first
    try {
      const cached = await this.redis.get(`${REDIS_PREFIX}id:${id}`);
      if (cached) {
        return JSON.parse(cached) as IvrNode;
      }
    } catch (err) {
      this.logger.warn(`Redis get error for node ${id}: ${err}`);
    }

    // Fallback to DB
    const node = await this.nodeRepo.findOne({ where: { id } });
    if (node) {
      await this.cacheNode(node);
    }
    return node;
  }

  /**
   * Get root node by name (with cache)
   */
  async getRootNode(name: string = 'root'): Promise<IvrNode | null> {
    // Try cache first
    try {
      const cached = await this.redis.get(`${REDIS_PREFIX}root:${name}`);
      if (cached) {
        return JSON.parse(cached) as IvrNode;
      }
    } catch (err) {
      this.logger.warn(`Redis get error for root ${name}: ${err}`);
    }

    // Fallback to DB
    const node = await this.nodeRepo.findOne({
      where: { name, parentId: IsNull() },
    });
    
    if (node) {
      await this.cacheNode(node);
      // Also cache by root name for fast lookup
      try {
        await this.redis.setEx(
          `${REDIS_PREFIX}root:${name}`,
          NODE_TTL,
          JSON.stringify(node)
        );
      } catch (err) {
        this.logger.warn(`Redis set error for root ${name}: ${err}`);
      }
    }
    
    return node;
  }

  /**
   * Get child node by parent ID and digit (with cache)
   */
  async getChildByDigit(parentId: string, digit: string): Promise<IvrNode | null> {
    const cacheKey = `${REDIS_PREFIX}child:${parentId}:${digit}`;
    
    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as IvrNode;
      }
    } catch (err) {
      this.logger.warn(`Redis get error for child ${parentId}:${digit}: ${err}`);
    }

    // Fallback to DB
    const node = await this.nodeRepo.findOne({
      where: { parentId, digit },
    });
    
    if (node) {
      await this.cacheNode(node);
      // Cache by parent+digit for fast menu navigation
      try {
        await this.redis.setEx(cacheKey, NODE_TTL, JSON.stringify(node));
      } catch (err) {
        this.logger.warn(`Redis set error for child: ${err}`);
      }
    }
    
    return node;
  }

  /**
   * Get all children of a node (with cache)
   */
  async getChildren(parentId: string): Promise<IvrNode[]> {
    const cacheKey = `${REDIS_PREFIX}children:${parentId}`;
    
    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as IvrNode[];
      }
    } catch (err) {
      this.logger.warn(`Redis get error for children ${parentId}: ${err}`);
    }

    // Fallback to DB
    const children = await this.nodeRepo.find({
      where: { parentId },
      order: { order: 'ASC' },
    });
    
    // Cache children list
    if (children.length > 0) {
      try {
        await this.redis.setEx(cacheKey, NODE_TTL, JSON.stringify(children));
      } catch (err) {
        this.logger.warn(`Redis set error for children: ${err}`);
      }
    }
    
    return children;
  }

  /**
   * Get media by ID (with cache)
   */
  async getMediaById(id: string): Promise<IvrMedia | null> {
    if (!id) return null;

    // Try cache first
    try {
      const cached = await this.redis.get(`${MEDIA_PREFIX}${id}`);
      if (cached) {
        return JSON.parse(cached) as IvrMedia;
      }
    } catch (err) {
      this.logger.warn(`Redis get error for media ${id}: ${err}`);
    }

    // Fallback to DB
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (media) {
      await this.cacheMedia(media);
    }
    return media;
  }

  /**
   * Build full tree structure (for admin UI)
   */
  async getFullTree(): Promise<IvrNode[]> {
    // Try cache first
    try {
      const cached = await this.redis.get(TREE_KEY);
      if (cached) {
        return JSON.parse(cached) as IvrNode[];
      }
    } catch (err) {
      this.logger.warn(`Redis get error for full tree: ${err}`);
    }

    // Build from DB
    return this.buildAndCacheTree();
  }

  private async buildAndCacheTree(): Promise<IvrNode[]> {
    const roots = await this.nodeRepo.find({
      where: { parentId: IsNull() },
      order: { order: 'ASC' },
    });

    try {
      await this.redis.setEx(TREE_KEY, TREE_TTL, JSON.stringify(roots));
    } catch (err) {
      this.logger.warn(`Redis set error for full tree: ${err}`);
    }

    return roots;
  }

  /**
   * Cache a single node
   */
  private async cacheNode(node: IvrNode): Promise<void> {
    try {
      await this.redis.setEx(
        `${REDIS_PREFIX}id:${node.id}`,
        NODE_TTL,
        JSON.stringify(node)
      );
    } catch (err) {
      this.logger.warn(`Redis set error for node ${node.id}: ${err}`);
    }
  }

  /**
   * Cache a single media file
   */
  private async cacheMedia(media: IvrMedia): Promise<void> {
    try {
      await this.redis.setEx(
        `${MEDIA_PREFIX}${media.id}`,
        NODE_TTL,
        JSON.stringify(media)
      );
    } catch (err) {
      this.logger.warn(`Redis set error for media ${media.id}: ${err}`);
    }
  }

  /**
   * Invalidate cache for a specific node
   */
  async invalidateNode(nodeId: string): Promise<void> {
    try {
      // Get node first to know its parent
      const node = await this.nodeRepo.findOne({ where: { id: nodeId } });
      
      // Delete node cache
      await this.redis.del(`${REDIS_PREFIX}id:${nodeId}`);
      
      if (node) {
        // Delete parent's children cache
        if (node.parentId) {
          await this.redis.del(`${REDIS_PREFIX}children:${node.parentId}`);
          await this.redis.del(`${REDIS_PREFIX}child:${node.parentId}:${node.digit}`);
        }
        
        // If it's a root node, invalidate root cache
        if (!node.parentId) {
          await this.redis.del(`${REDIS_PREFIX}root:${node.name}`);
        }
      }
      
      // Invalidate full tree
      await this.redis.del(TREE_KEY);
      
      this.logger.log(`Invalidated cache for node ${nodeId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate cache for node ${nodeId}: ${err}`);
    }
  }

  /**
   * Invalidate cache for a specific media file
   */
  async invalidateMedia(mediaId: string): Promise<void> {
    try {
      await this.redis.del(`${MEDIA_PREFIX}${mediaId}`);
      this.logger.log(`Invalidated cache for media ${mediaId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate media cache for ${mediaId}: ${err}`);
    }
  }

  /**
   * Clear all IVR cache
   */
  async clearAll(): Promise<void> {
    try {
      const nodeKeys = await this.redis.keys(`${REDIS_PREFIX}*`);
      const mediaKeys = await this.redis.keys(`${MEDIA_PREFIX}*`);
      const allKeys = [...nodeKeys, ...mediaKeys, TREE_KEY];
      
      if (allKeys.length > 0) {
        await this.redis.del(allKeys);
      }
      
      this.logger.log(`Cleared ${allKeys.length} IVR cache entries`);
    } catch (err) {
      this.logger.warn(`Failed to clear IVR cache: ${err}`);
    }
  }

  /**
   * Refresh entire cache
   */
  async refresh(): Promise<void> {
    await this.clearAll();
    await this.warmupCache();
  }
}
