#!/bin/bash

# Phase 3 P3 - 剧本与角色管理模块演示脚本

echo "========================================="
echo "Phase 3 P3 - 剧本与角色管理模块演示"
echo "========================================="
echo ""

# 配置
BASE_URL="http://localhost:3000/api"
TOKEN="YOUR_JWT_TOKEN"
PROJECT_ID="1"

# 设置认证头
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo "📝 1. 创建剧本..."
echo ""

SCRIPT_RESPONSE=$(curl -s -X POST "$BASE_URL/scripts/projects/$PROJECT_ID/scripts" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "第一集：初遇",
    "description": "男女主角在咖啡厅初次相遇的浪漫故事",
    "content": "【场景】\n时间：傍晚 6 点\n地点：街角咖啡厅\n人物：李明（25 岁，程序员），小红（23 岁，设计师）\n\n【动作】\n李明推门进入咖啡厅，风铃响起。他环顾四周，找了个靠窗的位置坐下。\n\n【对话】\n服务员：先生，请问您要点什么？\n李明：一杯美式咖啡，谢谢。\n\n【动作】\n这时，小红匆匆走进咖啡厅，不小心撞到了李明的桌子。\n\n小红：啊！对不起对不起！\n李明：没关系，你没受伤吧？\n\n【转场】\n✂ ✂ ✂\n\n【场景】\n时间：傍晚 6 点 30 分\n地点：街角咖啡厅\n\n【对话】\n李明：你也经常来这里吗？\n小红：是的，我每周都会来几次。你是新面孔呢。\n李明：我今天刚搬到附近。"
  }')

echo "$SCRIPT_RESPONSE" | jq '.'
SCRIPT_ID=$(echo "$SCRIPT_RESPONSE" | jq -r '.data.id')
echo ""
echo "✅ 剧本创建成功，ID: $SCRIPT_ID"
echo ""

echo "🎭 2. 创建角色 - 李明..."
echo ""

CHARACTER1_RESPONSE=$(curl -s -X POST "$BASE_URL/characters/projects/$PROJECT_ID/characters" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "李明",
    "description": "男主角，25 岁，软件工程师。性格内向但细心，对技术充满热情。",
    "appearance": "身高 180cm，黑色短发，戴黑框眼镜，常穿格子衬衫和牛仔裤",
    "gender": "male",
    "ageRange": "young_adult",
    "personality": {
      "trait_1": "内向",
      "trait_2": "细心",
      "trait_3": "技术宅",
      "trait_4": "善良"
    }
  }')

echo "$CHARACTER1_RESPONSE" | jq '.'
CHARACTER1_ID=$(echo "$CHARACTER1_RESPONSE" | jq -r '.data.id')
echo ""
echo "✅ 角色李明创建成功，ID: $CHARACTER1_ID"
echo ""

echo "🎭 3. 创建角色 - 小红..."
echo ""

CHARACTER2_RESPONSE=$(curl -s -X POST "$BASE_URL/characters/projects/$PROJECT_ID/characters" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "小红",
    "description": "女主角，23 岁，平面设计师。性格开朗活泼，富有创造力和想象力。",
    "appearance": "身高 165cm，棕色长发，大眼睛，喜欢穿时尚的连衣裙",
    "gender": "female",
    "ageRange": "young_adult",
    "personality": {
      "trait_1": "开朗",
      "trait_2": "活泼",
      "trait_3": "有创意",
      "trait_4": "乐观"
    }
  }')

echo "$CHARACTER2_RESPONSE" | jq '.'
CHARACTER2_ID=$(echo "$CHARACTER2_RESPONSE" | jq -r '.data.id')
echo ""
echo "✅ 角色小红创建成功，ID: $CHARACTER2_ID"
echo ""

echo "🔗 4. 将李明关联到剧本..."
echo ""

LINK1_RESPONSE=$(curl -s -X POST "$BASE_URL/scripts/$SCRIPT_ID/characters" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"characterId\": \"$CHARACTER1_ID\"
  }")

echo "$LINK1_RESPONSE" | jq '.'
echo ""
echo "✅ 李明已关联到剧本"
echo ""

echo "🔗 5. 将小红关联到剧本..."
echo ""

LINK2_RESPONSE=$(curl -s -X POST "$BASE_URL/scripts/$SCRIPT_ID/characters" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "{
    \"characterId\": \"$CHARACTER2_ID\"
  }")

echo "$LINK2_RESPONSE" | jq '.'
echo ""
echo "✅ 小红已关联到剧本"
echo ""

echo "📖 6. 获取剧本详情（包含关联角色）..."
echo ""

curl -s -X GET "$BASE_URL/scripts/$SCRIPT_ID" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "👥 7. 获取项目下的角色列表..."
echo ""

curl -s -X GET "$BASE_URL/characters/projects/$PROJECT_ID/characters" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "📚 8. 获取剧本关联的角色列表..."
echo ""

curl -s -X GET "$BASE_URL/scripts/$SCRIPT_ID/characters" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "📜 9. 添加剧本新版本..."
echo ""

VERSION_RESPONSE=$(curl -s -X POST "$BASE_URL/scripts/$SCRIPT_ID/versions" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "content": "【场景】\n时间：傍晚 6 点\n地点：街角咖啡厅\n人物：李明，小红\n\n【动作】\n李明推门进入咖啡厅，风铃响起。\n\n【对话】\n李明：一杯美式咖啡，谢谢。\n\n【动作】\n小红匆匆走进来，撞到了李明的桌子。\n\n小红：对不起！\n李明：没关系。\n\n【修改说明】简化了第二版内容",
    "changeLog": "简化内容，优化节奏"
  }')

echo "$VERSION_RESPONSE" | jq '.'
echo ""
echo "✅ 新版本添加成功"
echo ""

echo "📋 10. 获取剧本版本历史..."
echo ""

curl -s -X GET "$BASE_URL/scripts/$SCRIPT_ID/versions" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "📤 11. 导出剧本..."
echo ""

curl -s -X GET "$BASE_URL/scripts/$SCRIPT_ID/export" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "📝 12. 更新剧本状态为已发布..."
echo ""

curl -s -X PUT "$BASE_URL/scripts/$SCRIPT_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "status": "published"
  }' | jq '.'
echo ""

echo "🎭 13. 获取角色关联的剧本列表..."
echo ""

curl -s -X GET "$BASE_URL/characters/$CHARACTER1_ID/scripts" \
  -H "$AUTH_HEADER" | jq '.'
echo ""

echo "========================================="
echo "✅ Phase 3 P3 演示完成！"
echo "========================================="
echo ""
echo "已创建："
echo "  - 1 个剧本（ID: $SCRIPT_ID）"
echo "  - 2 个角色（ID: $CHARACTER1_ID, $CHARACTER2_ID）"
echo "  - 2 个剧本 - 角色关联"
echo "  - 1 个剧本版本"
echo ""
echo "演示了以下 API 端点："
echo "  ✅ POST /scripts/projects/:projectId/scripts"
echo "  ✅ GET /scripts/:id"
echo "  ✅ PUT /scripts/:id"
echo "  ✅ POST /scripts/:id/characters"
echo "  ✅ GET /scripts/:id/characters"
echo "  ✅ POST /scripts/:id/versions"
echo "  ✅ GET /scripts/:id/versions"
echo "  ✅ GET /scripts/:id/export"
echo "  ✅ POST /characters/projects/:projectId/characters"
echo "  ✅ GET /characters/projects/:projectId/characters"
echo "  ✅ GET /characters/:id/scripts"
echo ""
