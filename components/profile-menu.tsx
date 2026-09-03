import { CalendarDays, Home, Settings, LayoutDashboard } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

export type ProfileView = 'today' | 'history' | 'account' | 'admin';
export function ProfileMenu({nickname, onNavigate}: {nickname: string; onNavigate: (view: ProfileView) => void}) {
  return <DropdownMenu>
    <DropdownMenuTrigger className="profile-trigger" aria-label={`個人選單：${nickname}`} title="健康紀錄與個人設定"><span aria-hidden>{Array.from(nickname.trim())[0] || '我'}</span></DropdownMenuTrigger>
    <DropdownMenuContent className="profile-menu" align="end" sideOffset={10}>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="profile-menu-name">{nickname}<span>示範帳號</span></DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onNavigate('today')}><Home aria-hidden />回到首頁</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate('history')}><CalendarDays aria-hidden />健康紀錄</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate('account')}><Settings aria-hidden />我的帳號／設定</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onNavigate('admin')}><LayoutDashboard aria-hidden />管理端示範</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
