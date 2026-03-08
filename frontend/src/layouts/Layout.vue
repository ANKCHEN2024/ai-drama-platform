<template>
  <div class="layout">
    <nav class="navbar">
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">
          <span class="brand-icon">🎬</span>
          <span class="brand-text">AI 短剧平台</span>
        </router-link>
      </div>
      <div class="navbar-menu">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/projects" class="nav-item">项目</router-link>
        <router-link to="/profile" class="nav-item">个人中心</router-link>
        <button @click="logout" class="nav-item logout-btn">退出</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'Layout',
  methods: {
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #1a1a2e;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);

  .navbar-brand {
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: #fff;
      font-size: 1.5rem;
      font-weight: bold;

      .brand-icon {
        font-size: 2rem;
      }
    }
  }

  .navbar-menu {
    display: flex;
    gap: 1.5rem;

    .nav-item {
      color: #e0e0e0;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: all 0.3s;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;

      &:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }

      &.router-link-active {
        background: rgba(99, 102, 241, 0.2);
        color: #6366f1;
      }

      &.logout-btn {
        &:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      }
    }
  }
}

.main-content {
  flex: 1;
  padding: 2rem;
  background: #0f0f1a;
}
</style>
