import api from './api';

const aiService = {
  async analyzeCode(code: string, language: string) {
    const { data } = await api.post('/ai/analyze', { code, language });
    return data;
  },
  async chat(message: string, history: { role: string; content: string }[]) {
    const { data } = await api.post('/ai/chat', { message, history });
    return data;
  },
  async debugCode(code: string, error: string, language: string) {
    const { data } = await api.post('/ai/debug', { code, error, language });
    return data;
  },
  async reviewPR(prId: string, diff: string) {
    const { data } = await api.post('/ai/review-pr', { prId, diff });
    return data;
  },
  async suggestCommitMessage(diff: string) {
    const { data } = await api.post('/ai/commit-message', { diff });
    return data;
  },
  async explainCode(code: string, language: string) {
    const { data } = await api.post('/ai/explain', { code, language });
    return data;
  },
  async generateTests(code: string, language: string, framework: string) {
    const { data } = await api.post('/ai/generate-tests', { code, language, framework });
    return data;
  },
  async fixBug(code: string, issue: string, language: string) {
    const { data } = await api.post('/ai/fix-bug', { code, issue, language });
    return data;
  },
  async optimizeCode(code: string, language: string) {
    const { data } = await api.post('/ai/optimize', { code, language });
    return data;
  },
  async getRepoInsights(owner: string, repo: string) {
    const { data } = await api.get(`/ai/insights/${owner}/${repo}`);
    return data;
  },
};

export default aiService;