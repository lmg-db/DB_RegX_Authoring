export const authService = {
  getCurrentUser: () => {
    // 实际应从后端获取用户信息
    return {
      id: "demo-user",
      role: "admin",
      name: "Demo User"
    };
  },
  
  isAdminUser: () => {
    return authService.getCurrentUser().role === 'admin';
  }
}; 