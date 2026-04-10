#!/bin/bash
set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "当前版本: ${GREEN}v${CURRENT_VERSION}${NC}"

# 获取最新 tag
LATEST_TAG=$(git tag --sort=-v:refname | head -1)
echo -e "最新 tag: ${GREEN}${LATEST_TAG}${NC}"

# 解析版本号
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# 选择 bump 类型
BUMP_TYPE=${1:-""}
if [ -z "$BUMP_TYPE" ]; then
    echo ""
    echo "选择版本类型:"
    echo -e "  ${YELLOW}1)${NC} patch  → v${MAJOR}.${MINOR}.$((PATCH + 1))"
    echo -e "  ${YELLOW}2)${NC} minor  → v${MAJOR}.$((MINOR + 1)).0"
    echo -e "  ${YELLOW}3)${NC} major  → v$((MAJOR + 1)).0.0"
    echo -e "  ${YELLOW}4)${NC} 自定义版本号"
    echo ""
    read -p "请选择 [1]: " CHOICE
    CHOICE=${CHOICE:-1}

    case $CHOICE in
        1) BUMP_TYPE="patch" ;;
        2) BUMP_TYPE="minor" ;;
        3) BUMP_TYPE="major" ;;
        4)
            read -p "输入版本号 (不含 v 前缀): " CUSTOM_VERSION
            if [[ ! "$CUSTOM_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                echo -e "${RED}无效的版本号格式，应为 x.y.z${NC}"
                exit 1
            fi
            BUMP_TYPE="custom"
            ;;
        *) echo -e "${RED}无效选择${NC}"; exit 1 ;;
    esac
fi

# 计算新版本
case $BUMP_TYPE in
    patch)  NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
    minor)  NEW_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
    major)  NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    custom) NEW_VERSION="$CUSTOM_VERSION" ;;
    *)      echo -e "${RED}无效的 bump 类型: $BUMP_TYPE${NC}"; exit 1 ;;
esac

TAG="v${NEW_VERSION}"

# 检查 tag 是否已存在
if git tag -l "$TAG" | grep -q "$TAG"; then
    echo -e "${RED}Tag ${TAG} 已存在!${NC}"
    exit 1
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}工作区有未提交的更改:${NC}"
    git status --short
    read -p "是否继续? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "已取消"
        exit 0
    fi
fi

echo ""
echo -e "即将执行: ${GREEN}v${CURRENT_VERSION}${NC} → ${GREEN}${TAG}${NC}"
read -p "确认? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消"
    exit 0
fi

# 更新 package.json 版本
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo -e "${GREEN}✓${NC} 已更新 package.json → ${NEW_VERSION}"

# 提交版本更新
git add package.json
git commit -m "release: v${NEW_VERSION}"
echo -e "${GREEN}✓${NC} 已提交版本更新"

# 创建 tag
git tag -a "$TAG" -m "Release ${TAG}"
echo -e "${GREEN}✓${NC} 已创建 tag: ${TAG}"

# 推送
git push origin HEAD
git push origin "$TAG"
echo -e "${GREEN}���${NC} 已推送到远程"

echo ""
echo -e "${GREEN}发布完成: ${TAG}${NC}"
