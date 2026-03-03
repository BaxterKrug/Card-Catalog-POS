import { apiClient } from "./client";

export interface User {
  id: number;
  name: string;
  username: string;
  role: "owner" | "manager" | "employee";
  title?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  name: string;
  username: string;
  password: string;
  role?: "owner" | "manager" | "employee";
  title?: string;
  email?: string;
  is_active?: boolean;
}

export interface UserUpdateInput {
  name?: string;
  role?: "owner" | "manager" | "employee";
  title?: string;
  email?: string;
  is_active?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/users/login", payload);
  return data;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users");
  return data;
}

export async function createUser(payload: UserCreateInput): Promise<User> {
  const { data } = await apiClient.post<User>("/users", payload);
  return data;
}

export async function updateUser(userId: number, payload: UserUpdateInput): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
  return data;
}
