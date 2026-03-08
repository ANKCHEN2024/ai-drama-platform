<template>
  <div class="new-project-page">
    <div class="page-header">
      <h1>创建新项目</h1>
      <button @click="$router.push('/projects')" class="btn-secondary">
        返回列表
      </button>
    </div>

    <div class="form-container">
      <form @submit.prevent="handleSubmit">
        <!-- 基本信息 -->
        <div class="form-section">
          <h2>基本信息</h2>
          
          <div class="form-group">
            <label for="name">项目名称 *</label>
            <input
              type="text"
              id="name"
              v-model="form.name"
              placeholder="输入项目名称"
              required
              :class="{ error: errors.name }"
            />
            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
          </div>

          <div class="form-group">
            <label for="description">项目描述</label>
            <textarea
              id="description"
              v-model="form.description"
              placeholder="简要描述项目内容"
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- 剧集设置 -->
        <div class="form-section">
          <h2>剧集设置</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="episodeCount">剧集数量</label>
              <input
                type="number"
                id="episodeCount"
                v-model.number="form.episodeCount"
                min="1"
                max="100"
              />
            </div>

            <div class="form-group">
              <label for="episodeDuration">单集时长（秒）</label>
              <input
                type="number"
                id="episodeDuration"
                v-model.number="form.episodeDuration"
                min="10"
                max="600"
              />
            </div>
          </div>
        </div>

        <!-- 视频设置 -->
        <div class="form-section">
          <h2>视频设置</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="videoRatio">画面比例</label>
              <select id="videoRatio" v-model="form.videoRatio">
                <option value="9:16">9:16 (竖屏)</option>
                <option value="16:9">16:9 (横屏)</option>
                <option value="1:1">1:1 (正方形)</option>
                <option value="4:5">4:5 (Instagram)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="videoQuality">视频质量</label>
              <select id="videoQuality" v-model="form.videoQuality">
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4k">4K</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 项目状态 -->
        <div class="form-section">
          <h2>项目状态</h2>
          
          <div class="form-group">
            <label for="status">初始状态</label>
            <select id="status" v-model="form.status">
              <option value="draft">草稿</option>
              <option value="producing">制作中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <button type="button" @click="$router.push('/projects')" class="btn-secondary">
            取消
          </button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '创建中...' : '创建项目' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import api from '../utils/api';

export default {
  name: 'NewProject',
  setup() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const loading = ref(false);
    const errors = ref({});

    const form = ref({
      name: '',
      description: '',
      episodeCount: 10,
      episodeDuration: 60,
      videoRatio: '9:16',
      videoQuality: '1080p',
      status: 'draft'
    });

    const validate = () => {
      errors.value = {};
      
      if (!form.value.name || form.value.name.trim() === '') {
        errors.value.name = '项目名称不能为空';
      }

      return Object.keys(errors.value).length === 0;
    };

    const handleSubmit = async () => {
      if (!validate()) return;

      loading.value = true;

      try {
        const response = await api.post('/projects', form.value);
        
        if (response.data.success) {
          // 创建成功，跳转到项目详情页
          router.push(`/projects/${response.data.data.id}`);
        }
      } catch (error) {
        console.error('创建项目失败:', error);
        if (error.response?.data?.error) {
          alert(error.response.data.error);
        } else {
          alert('创建项目失败，请稍后重试');
        }
      } finally {
        loading.value = false;
      }
    };

    return {
      loading,
      errors,
      form,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.new-project-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 24px;
  color: #1a1a1a;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 30px;
}

.form-section h2 {
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4a90e2;
}

.form-group input.error {
  border-color: #e74c3c;
}

.error-text {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.btn-primary,
.btn-secondary {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #4a90e2;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #f5f5f5;
}
</style>
