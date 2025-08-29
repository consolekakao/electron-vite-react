export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Mock 사용자 데이터
const mockUsers: Array<{ username: string; password: string; userData: User }> = [
  {
    username: 'admin',
    password: 'password123',
    userData: {
      id: '1',
      name: '관리자',
      email: 'admin@example.com',
      role: '관리자',
    },
  },
  {
    username: 'user1',
    password: 'user123',
    userData: {
      id: '2',
      name: '김철수',
      email: 'kim@example.com',
      role: '사용자',
    },
  },
  {
    username: 'manager',
    password: 'manager123',
    userData: {
      id: '3',
      name: '이영희',
      email: 'lee@example.com',
      role: '매니저',
    },
  },
];

// 로그인 함수
export const login = async (username: string, password: string): Promise<User | null> => {
  // 실제 API 호출을 시뮬레이션하기 위해 지연 추가
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const user = mockUsers.find(
    u => u.username === username && u.password === password
  );
  
  if (user) {
    // 토큰을 localStorage에 저장 (실제 앱에서는 보안을 위해 다른 방법 사용)
    // 한글 문자 지원을 위해 base64 인코딩 방식 변경
    const token = btoa(encodeURIComponent(JSON.stringify(user.userData)));
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user.userData));
    return user.userData;
  }
  
  return null;
};

// 로그아웃 함수
export const logout = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
};

// 현재 사용자 가져오기
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('auth_token');
  
  if (userStr && token) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  
  return null;
};

// 인증 상태 확인
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};