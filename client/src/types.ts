export interface User {
    id: number;
    first_name: string;
    last_name: string;
    nickname: string;
    email: string;
    username: string;
    user_type_id: number;
    email_verified: number;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    isLoggedIn: boolean;
}

export interface LoginData {
    user: string;
    password: string;
}

export interface RegisterData {
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

export interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (value: boolean) => void;
}

export interface Bill {
    id: number;
    bill_name: string;
    invite_code: string;
    created_by: number;
    created_at: string;
    archived_at?: string;
}

export interface InvolvedPerson {
    id: number | string; // string for guest temp IDs
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    is_guest: boolean;
    user_id?: number; // link to registered user
}

export interface Expense {
    id: number;
    bill_id: number;
    expense_name: string;
    total_amount: number;
    paid_by_id: number | string;
    split_type: 'equally' | 'custom';
    involved_person_ids: (number | string)[]; // who is sharing this expense
    created_at: string;
}

export interface GuestData {
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
}
