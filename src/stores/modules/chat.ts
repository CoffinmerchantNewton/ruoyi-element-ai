import type { ChatMessageVo } from '@/api/chat/types';
import { defineStore } from 'pinia';
import { getChatList } from '@/api';
import { useUserStore } from './user';

export const useChatStore = defineStore('chat', () => {
  const userStore = useUserStore();

  // 用户头像
  const avatar = computed(() => {
    const userInfo = userStore.userInfo;
    return userInfo?.avatar || 'https://avatars.githubusercontent.com/u/76239030?v=4';
  });

  // 是否开启深度思考
  const isDeepThinking = ref<boolean>(false);

  const setDeepThinking = (value: boolean) => {
    isDeepThinking.value = value;
  };

  // 会议ID对应-聊天记录 map对象
  const chatMap = ref<Record<string, ChatMessageVo[]>>({});

  const setChatMap = (id: string, data: ChatMessageVo[]) => {
    chatMap.value[id] = data?.map((item: ChatMessageVo) => {
      const isUser = item.role === 'user';
      const rawContent = item.content as string || '';
      const thinkContent = extractThkContent(rawContent);
      const processedContent = extractThkContentAfter(rawContent);
      return {
        ...item,
        key: item.id,
        role: isUser ? 'user' : 'system', // 将 assistant 转换为 system
        placement: isUser ? 'end' : 'start',
        isMarkdown: !isUser,
        // variant: 'shadow',
        // shape: 'corner',
        avatar: isUser
          ? avatar
          : 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
        avatarSize: '32px',
        typing: false,
        reasoning_content: thinkContent,
        thinkingStatus: 'end',
        content: processedContent,
        thinlCollapse: false,
      };
    });
  };

  // 获取当前会话的聊天记录
  const requestChatList = async (sessionId: string) => {
    // 如果没有 token 则不查询聊天记录
    if (!userStore.token)
      return;
    try {
      const res = await getChatList({
        sessionId,
        userId: userStore.userInfo?.userId as number,
      });
      if (res.rows) {
        setChatMap(sessionId, res.rows);
      }
    }
    catch (error) {
      console.error('getChatList:', error);
    }
  };

  // 将字符串中的 \n 转义序列转换为实际的换行符
  function convertNewlines(content: string | undefined): string {
    if (!content)
      return '';
    // 将字符串字面量 \n 转换为实际的换行符
    return content.replace(/\\n/g, '\n');
  }

  // 对思考中的内容回显做处理
  function extractThkContent(content: string) {
    const regex = /<think>(.*?)<\/think>/s;
    const matchResult = content.match(regex);
    // 把这些内容从 content 中移除
    content = content.replace(regex, '');
    return matchResult?.[1] ?? '';
  }

  // 如果有 </think> 标签，则把 </think> 之后的 内容从 content 中返回
  function extractThkContentAfter(content: string) {
    if (!content.includes('</think>')) {
      return convertNewlines(content);
    }
    const regex = /<\/think>(.*)/s;
    const matchResult = content.match(regex);
    // 把这些内容从 content 中移除
    content = content.replace(regex, '');
    return convertNewlines(matchResult?.[1] ?? '');
  }

  return {
    chatMap,
    requestChatList,
    isDeepThinking,
    setDeepThinking,
  };
});
