/**
 * Scene Storage - 场景存储模块
 * 
 * 负责场景数据的持久化存储和查询
 * 支持 PostgreSQL + Redis + MinIO
 */

const { Pool } = require('pg');
const Redis = require('redis');
const axios = require('axios');

class SceneStorage {
  /**
   * 创建存储实例
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // PostgreSQL 配置
    this.pgPool = new Pool({
      connectionString: options.databaseUrl || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    // Redis 配置
    this.redis = Redis.createClient({
      url: options.redisUrl || process.env.REDIS_URL
    });
    this.redis.connect().catch(console.error);

    // MinIO 配置
    this.minioConfig = {
      endPoint: options.minioEndpoint || process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(options.minioPort || process.env.MINIO_PORT || '9000'),
      useSSL: options.minioSSL || false,
      accessKey: options.minioAccessKey || process.env.MINIO_ACCESS_KEY,
      secretKey: options.minioSecretKey || process.env.MINIO_SECRET_KEY,
      bucket: options.minioBucket || process.env.MINIO_BUCKET || 'scenes'
    };
  }

  /**
   * 保存场景
   * @param {SceneDescription} scene - 场景描述
   * @returns {Promise<void>}
   */
  async saveScene(scene) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 插入或更新场景
      const query = `
        INSERT INTO scenes (
          scene_id, episode_id, location, time, atmosphere,
          props, character_positions, lighting, color_palette,
          image_prompt, negative_prompt, base_seed, style, version,
          shot_ids, status, tags, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (scene_id) DO UPDATE SET
          episode_id = EXCLUDED.episode_id,
          location = EXCLUDED.location,
          time = EXCLUDED.time,
          atmosphere = EXCLUDED.atmosphere,
          props = EXCLUDED.props,
          character_positions = EXCLUDED.character_positions,
          lighting = EXCLUDED.lighting,
          color_palette = EXCLUDED.color_palette,
          image_prompt = EXCLUDED.image_prompt,
          negative_prompt = EXCLUDED.negative_prompt,
          base_seed = EXCLUDED.base_seed,
          style = EXCLUDED.style,
          version = EXCLUDED.version,
          shot_ids = EXCLUDED.shot_ids,
          status = EXCLUDED.status,
          tags = EXCLUDED.tags,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const values = [
        scene.sceneId,
        scene.episodeId || null,
        scene.location,
        scene.time,
        scene.atmosphere || null,
        JSON.stringify(scene.props || []),
        JSON.stringify(scene.characterPositions || []),
        scene.lighting || null,
        JSON.stringify(scene.colorPalette || []),
        scene.imagePrompt,
        scene.negativePrompt || null,
        scene.consistency?.baseSeed || null,
        scene.consistency?.style || null,
        scene.consistency?.version || '1.0',
        JSON.stringify(scene.metadata?.shotIds || []),
        scene.metadata?.status || 'draft',
        JSON.stringify(scene.metadata?.tags || []),
        scene.metadata?.createdBy || null,
        scene.metadata?.updatedBy || null
      ];
      
      await client.query(query, values);
      
      // 记录历史
      await this.recordHistory(client, scene, 'created');
      
      await client.query('COMMIT');
      
      // 更新缓存
      await this.cacheScene(scene);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取场景
   * @param {string} sceneId - 场景 ID
   * @returns {Promise<SceneDescription>}
   */
  async getScene(sceneId) {
    // 先查缓存
    const cached = await this.getCachedScene(sceneId);
    if (cached) {
      return cached;
    }
    
    // 查数据库
    const query = `
      SELECT * FROM scenes
      WHERE scene_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.pgPool.query(query, [sceneId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const scene = this.rowToScene(result.rows[0]);
    
    // 加载关联的图像
    scene.images = await this.getSceneImages(sceneId);
    
    // 更新缓存
    await this.cacheScene(scene);
    
    return scene;
  }

  /**
   * 查询场景列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Scene[]>}
   */
  async queryScenes(filters = {}) {
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;
    
    // 构建查询条件
    if (filters.episodeId) {
      conditions.push(`episode_id = $${paramIndex++}`);
      values.push(filters.episodeId);
    }
    
    if (filters.style) {
      conditions.push(`style = $${paramIndex++}`);
      values.push(filters.style);
    }
    
    if (filters.location) {
      conditions.push(`location ILIKE $${paramIndex++}`);
      values.push(`%${filters.location}%`);
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    // 分页
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;
    
    const query = `
      SELECT * FROM scenes
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    values.push(pageSize, offset);
    
    const result = await this.pgPool.query(query, values);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) FROM scenes
      WHERE ${conditions.join(' AND ')}
    `;
    
    const countResult = await this.pgPool.query(
      countQuery,
      values.slice(0, paramIndex - 2)
    );
    
    const scenes = result.rows.map(row => this.rowToScene(row));
    const total = parseInt(countResult.rows[0].count);
    
    return {
      scenes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 删除场景（软删除）
   * @param {string} sceneId 
   * @returns {Promise<void>}
   */
  async deleteScene(sceneId) {
    const query = `
      UPDATE scenes
      SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
      WHERE scene_id = $1
    `;
    
    await this.pgPool.query(query, [sceneId]);
    
    // 清除缓存
    await this.redis.del(`scene:${sceneId}`);
  }

  /**
   * 保存场景图像
   * @param {string} sceneId 
   * @param {Object} imageData 
   * @returns {Promise<void>}
   */
  async saveSceneImage(sceneId, imageData) {
    const query = `
      INSERT INTO scene_images (
        scene_id, image_url, thumbnail_url, seed,
        width, height, model, negative_prompt,
        generation_time, cost, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    
    const values = [
      sceneId,
      imageData.imageUrl,
      imageData.thumbnailUrl || null,
      imageData.seed,
      imageData.width || 1920,
      imageData.height || 1080,
      imageData.model || 'wanx-v1',
      imageData.negativePrompt || null,
      imageData.generationTime || null,
      imageData.cost || null,
      imageData.status || 'completed'
    ];
    
    await this.pgPool.query(query, values);
  }

  /**
   * 获取场景图像列表
   * @param {string} sceneId 
   * @returns {Promise<Array>}
   */
  async getSceneImages(sceneId) {
    const query = `
      SELECT * FROM scene_images
      WHERE scene_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pgPool.query(query, [sceneId]);
    return result.rows;
  }

  /**
   * 记录场景历史
   * @param {Object} client - 数据库客户端
   * @param {SceneDescription} scene 
   * @param {string} changeType 
   */
  async recordHistory(client, scene, changeType) {
    const query = `
      INSERT INTO scene_history (
        scene_id, change_type, changed_fields, snapshot, changed_by
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    
    const values = [
      scene.sceneId,
      changeType,
      JSON.stringify({}), // 可以记录具体变更字段
      JSON.stringify(scene),
      scene.metadata?.updatedBy || null
    ];
    
    await client.query(query, values);
  }

  /**
   * 缓存场景到 Redis
   * @param {SceneDescription} scene 
   */
  async cacheScene(scene) {
    const key = `scene:${scene.sceneId}`;
    await this.redis.setEx(
      key,
      3600, // 1 小时 TTL
      JSON.stringify(scene)
    );
  }

  /**
   * 从缓存获取场景
   * @param {string} sceneId 
   * @returns {Promise<SceneDescription>}
   */
  async getCachedScene(sceneId) {
    const key = `scene:${sceneId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * 数据库行转场景对象
   * @param {Object} row 
   * @returns {SceneDescription}
   */
  rowToScene(row) {
    return {
      sceneId: row.scene_id,
      episodeId: row.episode_id,
      location: row.location,
      time: row.time,
      atmosphere: row.atmosphere,
      props: JSON.parse(row.props),
      characterPositions: JSON.parse(row.character_positions),
      lighting: row.lighting,
      colorPalette: JSON.parse(row.color_palette),
      imagePrompt: row.image_prompt,
      negativePrompt: row.negative_prompt,
      consistency: {
        baseSeed: row.base_seed,
        style: row.style,
        version: row.version
      },
      metadata: {
        shotIds: JSON.parse(row.shot_ids),
        status: row.status,
        tags: JSON.parse(row.tags),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by
      }
    };
  }

  /**
   * 关闭连接
   */
  async close() {
    await this.pgPool.end();
    await this.redis.quit();
  }
}

module.exports = SceneStorage;
