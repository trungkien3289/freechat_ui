import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatboxLayoutComponent } from './chatbox-layout/chatbox-layout.component';
import { MainChatboxComponent } from './main-chatbox/main-chatbox.component';
import { NzListModule } from 'ng-zorro-antd/list';

const routes: Routes = [
  {
    path: '',
    component: ChatboxLayoutComponent, // This is the common layout
    children: [
      // { path: 'main', component: MainChatboxComponent }, // Select Emotion page
      { path: '', redirectTo: 'user/', pathMatch: 'full' }, // Default route
      { path: 'user/:id', component: MainChatboxComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), NzListModule],
  exports: [RouterModule],
})
export class ChatboxRoutingModule {}
