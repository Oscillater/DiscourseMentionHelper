// ==UserScript==
// @name         Discourse Mention Helper
// @namespace    https://github.com/Oscillater/DiscourseMentionHelper
// @version      0.1
// @description  现在每个帖子右侧会出现@按钮，点击按钮即可艾特所有点赞该帖子的用户；在有记名投票的帖子底部增加按钮，点击后弹出菜单选择投票选项，可以自动艾特投特定选项的用户名单。
// @author       Narrenschiff(aka Oscillater) & Gemini 3 Pro
// @match        https://shuiyuan.sjtu.edu.cn/*
// @match        https://linux.do/*
// @match        https://meta.discourse.org/*
// @grant        none
// @license      GPL-3.0-only
// ==/UserScript==

(async () => {
    'use strict';

    // ==========================================
    // 1. 图标定义
    // ==========================================
    const AT_ICON = '<svg class="d-icon svg-icon" aria-hidden="true" fill="currentColor" viewBox="0 0 512 512"><path d="M256 64C150 64 64 150 64 256s86 192 192 192c17.7 0 32 14.3 32 32s-14.3 32-32 32C114.6 512 0 397.4 0 256S114.6 0 256 0s256 114.6 256 256v32c0 53-43 96-96 96c-29.3 0-55.6-13.2-73.2-33.9C320 371.1 289.5 384 256 384c-70.7 0-128-57.3-128-128s57.3-128 128-128c70.7 0 128 57.3 128 128v16c0 17.7 14.3 32 32 32s32-14.3 32-32v-32c0-79.5-64.5-144-144-144zM256 296a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"/></svg>';
    const POLL_ICON = '<svg class="d-icon svg-icon" aria-hidden="true" fill="currentColor" viewBox="0 0 512 512"><path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/></svg>';

    // ==========================================
    // 2. CSS 样式 (包含 Modal 和 Notification)
    // ==========================================
    const GLOBAL_CSS = `
        /* 1. 模拟 Discourse 原生提示框 (右上角绿色弹窗) */
        #mh-notification-container {
            position: fixed;
            top: 60px; /* 避开顶部导航栏 */
            right: 20px;
            z-index: 99999;
            pointer-events: none;
        }
        .mh-notification {
            background-color: #00a94f; /* Discourse 成功绿 */
            color: #ffffff;
            padding: 12px 25px;
            margin-bottom: 10px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 600;
            font-size: 14px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            display: flex;
            align-items: center;
        }
        .mh-notification.show {
            opacity: 1;
            transform: translateY(0);
        }
        .mh-notification.error {
            background-color: #e45735; /* 错误红 */
        }

        /* 2. 投票模态框样式 */
        .mh-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
        }
        .mh-modal-content {
            background: var(--secondary, #fff);
            color: var(--primary, #222);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.5);
            width: 400px;
            max-width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid var(--primary-low, #ddd);
            animation: mh-fadein 0.2s ease-out;
        }
        @keyframes mh-fadein {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .mh-modal-title {
            margin-top: 0; font-size: 1.2em;
            border-bottom: 1px solid var(--primary-low, #ddd);
            padding-bottom: 10px; margin-bottom: 15px; font-weight: bold;
        }
        .mh-poll-name {
            font-size: 0.9em; color: var(--primary-medium);
            margin-bottom: 5px; font-weight: bold;
        }
        .mh-option-btn {
            display: flex; justify-content: space-between; align-items: center;
            width: 100%; text-align: left; padding: 10px; margin-bottom: 8px;
            background: var(--tertiary-low, #f0f0f0);
            border: none; border-radius: 5px; cursor: pointer;
            color: var(--primary, #333); transition: background 0.2s;
            font-size: 14px;
        }
        .mh-option-btn:hover {
            background: var(--tertiary, #0088cc); color: var(--secondary, #fff);
        }
        .mh-vote-count {
            font-size: 0.8em; opacity: 0.7;
            background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 10px;
        }
        .mh-close-btn {
            margin-top: 10px; padding: 8px 15px; background: transparent;
            border: 1px solid var(--primary-medium); color: var(--primary);
            cursor: pointer; border-radius: 5px; float: right;
        }
        .mh-loading { opacity: 0.6; pointer-events: none; }
        .mh-like-btn, .mh-poll-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            vertical-align: middle !important;
        }

        /* 确保 SVG 尺寸和边距跟随原生样式，防止被意外挤压 */
        .mh-like-btn .d-icon, .mh-poll-btn .d-icon {
            margin: 0 !important;
            pointer-events: none; /* 避免点击事件传给 SVG 而不是 Button */
        }
    `;

    const style = document.createElement('style');
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);

    // ==========================================
    // 3. 核心功能函数
    // ==========================================

    // 创建通知容器
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'mh-notification-container';
    document.body.appendChild(notificationContainer);

    // 自定义显示通知 (完全替代原生 API)
    const showNotification = (text, type = 'success') => {
        const el = document.createElement('div');
        el.className = `mh-notification ${type === 'error' ? 'error' : ''}`;
        el.innerText = text;

        notificationContainer.appendChild(el);

        // 强制重绘以触发动画
        requestAnimationFrame(() => {
            el.classList.add('show');
        });

        // 3秒后消失
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300); // 等待 CSS transition 结束
        }, 3000);
    };

    const discourseFetch = async (url) => {
        const csrfToken = document.querySelector('meta[name=csrf-token]')?.content;
        const headers = { 'X-CSRF-Token': csrfToken, 'X-Requested-With': 'XMLHttpRequest' };
        const response = await fetch(url, { headers });
        if (response.status === 429) throw new Error('操作太快，请稍候');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级兼容
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    };

    // ==========================================
    // 4. 业务逻辑
    // ==========================================

    const getPollsFromApi = async (postId) => {
        try {
            const data = await discourseFetch(`/posts/${postId}.json`);
            if (!data || !data.polls || data.polls.length === 0) return null;
            return data.polls;
        } catch (e) {
            console.error("API Error", e);
            throw new Error("获取帖子数据失败");
        }
    };

    // ==========================================
// 4. 业务逻辑 (已修改，支持分页抓取)
// ==========================================
const fetchAndCopyVoters = async (postId, pollName, optionId, btnElement) => {
    const originalText = btnElement.innerHTML;
    btnElement.classList.add('mh-loading');

    let allVoters = [];
    let page = 1;
    let hasMore = true;
    const PAGE_LIMIT = 50; // 显式设定每页抓取 50 个

    try {
        while (hasMore) {
            btnElement.innerText = `正在获取第 ${page} 页...`;

            // 关键修正：必须显式带上 limit=50
            const url = `/polls/voters.json?post_id=${postId}&poll_name=${pollName}&option_id=${optionId}&page=${page}&limit=${PAGE_LIMIT}`;
            const data = await discourseFetch(url);

            const votersInPage = (data.voters && data.voters[optionId]) ? data.voters[optionId] : [];

            if (votersInPage.length === 0) {
                hasMore = false;
            } else {
                allVoters.push(...votersInPage);

                // 只有当拿到的人数正好等于 50 时，才认为可能有下一页
                if (votersInPage.length < PAGE_LIMIT) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            // 安全限制：防止某些情况下陷入无限循环（比如投票人数极多）
            if (page > 200) break;
        }

        if (allVoters.length === 0) {
            showNotification('无人投票或该投票为匿名投票', 'error');
        } else {
            const mentions = allVoters.map(u => `@${u.username}`).join(' ');
            await copyToClipboard(mentions);
            document.querySelector('.mh-modal-overlay')?.remove();
            showNotification(`已成功抓取 ${allVoters.length} 人`, 'success');
        }
    } catch (e) {
        console.error(e);
        showNotification(e.message || '获取失败', 'error');
    } finally {
        if(btnElement) {
            btnElement.innerHTML = originalText;
            btnElement.classList.remove('mh-loading');
        }
    }
};

    // ==========================================
    // 5. UI 构建 (弹窗)
    // ==========================================

    const showPollModal = (postId, pollsData) => {
        document.querySelector('.mh-modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'mh-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const content = document.createElement('div');
        content.className = 'mh-modal-content';

        const title = document.createElement('div');
        title.className = 'mh-modal-title';
        title.innerText = '选择选项以复制名单';
        content.appendChild(title);

        pollsData.forEach(poll => {
            if (pollsData.length > 1) {
                const pName = document.createElement('div');
                pName.className = 'mh-poll-name';
                pName.innerText = `投票: ${poll.name}`;
                content.appendChild(pName);
            }

            poll.options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'mh-option-btn';

                const textSpan = document.createElement('span');
                textSpan.innerHTML = option.html || option.text || `选项 ${option.id}`;

                const countSpan = document.createElement('span');
                countSpan.className = 'mh-vote-count';
                countSpan.innerText = `${option.votes} 票`;

                btn.appendChild(textSpan);
                btn.appendChild(countSpan);

                btn.onclick = () => {
                    fetchAndCopyVoters(postId, poll.name, option.id, btn);
                };
                content.appendChild(btn);
            });
        });

        const closeBtn = document.createElement('button');
        closeBtn.className = 'mh-close-btn';
        closeBtn.innerText = '关闭';
        closeBtn.onclick = () => overlay.remove();
        content.appendChild(closeBtn);

        overlay.appendChild(content);
        document.body.appendChild(overlay);
    };

    // ==========================================
    // 6. 按钮注入
    // ==========================================

    const handleLikers = async (btn, postId) => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '...';
        btn.style.pointerEvents = 'none';

        try {
            const data = await discourseFetch(`/post_action_users.json?id=${postId}&post_action_type_id=2`);
            const users = data.post_action_users || [];
            if (users.length === 0) {
                showNotification('暂时还没有人点赞', 'error');
            } else {
                const mentions = users.map(u => `@${u.username}`).join(' ');
                await copyToClipboard(mentions);
                showNotification(`已复制 ${users.length} 位点赞用户到剪贴板`, 'success');
            }
        } catch (e) {
            showNotification('获取失败', 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
        }
    };

    const addButtons = (node) => {
        const actions = node.querySelectorAll ? node.querySelectorAll('nav.post-controls .actions') : [];
        actions.forEach(actionContainer => {
            const article = actionContainer.closest('article');
            if (!article) return;
            const postId = article.getAttribute('data-post-id');
            if (!postId) return;

            // 1. 点赞复制按钮
            if (!actionContainer.querySelector('.mh-like-btn')) {
                const likeBtn = document.createElement('button');
                likeBtn.className = 'widget-button btn-flat no-text btn-icon mh-like-btn';
                likeBtn.title = '复制点赞名单';
                likeBtn.innerHTML = AT_ICON;
                likeBtn.style.color = '#e45735';
                likeBtn.onclick = () => handleLikers(likeBtn, postId);
                actionContainer.appendChild(likeBtn);
            }

            // 2. 投票菜单按钮
            if (article.querySelector('.poll') && !actionContainer.querySelector('.mh-poll-btn')) {
                const pollBtn = document.createElement('button');
                pollBtn.className = 'widget-button btn-flat no-text btn-icon mh-poll-btn';
                pollBtn.title = '选择投票选项并复制名单';
                pollBtn.innerHTML = POLL_ICON;
                pollBtn.style.color = '#0088cc';

                pollBtn.onclick = async () => {
                    const originalIcon = pollBtn.innerHTML;
                    try {
                        pollBtn.innerHTML = '...';
                        const pollsData = await getPollsFromApi(postId);

                        if (!pollsData) {
                            showNotification('未检测到有效投票数据', 'error');
                        } else {
                            showPollModal(postId, pollsData);
                        }
                    } catch (e) {
                        showNotification(e.message, 'error');
                    } finally {
                        pollBtn.innerHTML = originalIcon;
                    }
                };
                actionContainer.appendChild(pollBtn);
            }
        });
    };

    // ==========================================
    // 7. 启动
    // ==========================================

    const processMutations = (mutations) => {
        let shouldScan = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) shouldScan = true;
        });
        if (shouldScan) addButtons(document);
    };

    const observer = new MutationObserver(processMutations);
    observer.observe(document.body, { childList: true, subtree: true });

    addButtons(document);
    console.log('Discourse Mention Helper v0.1 Loaded.');

})();
