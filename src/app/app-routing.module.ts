import { ChatboxModule } from './chatbox/chatbox.module';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './gaurds/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'chatbox',
    loadChildren: () =>
      import('./chatbox/chatbox.module').then((m) => m.ChatboxModule),
    canActivate: [AuthGuard],
  },
  { path: '', redirectTo: '/chatbox', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
