import { ChatboxModule } from './chatbox/chatbox.module';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // { path: 'register', component: RegisterComponent },
  // { path: 'login', component: LoginComponent },
  // { path: 'emotion', component: EmotionComponent, canActivate: [AuthGuard] }, // Protect route
  // { path: '', redirectTo: '/login', pathMatch: 'full' },
  // {
  //   path: 'dashboard',
  //   component: DashboardComponent,
  //   canActivate: [AuthGuard],
  // },
  // {
  //   path: 'auth',
  //   loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  // },
  {
    path: 'chatbox',
    loadChildren: () =>
      import('./chatbox/chatbox.module').then((m) => m.ChatboxModule),
  },
  { path: '', redirectTo: '/chatbox', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
