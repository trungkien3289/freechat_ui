import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatboxRoutingModule } from './chatbox-routing.module';
import { ChatboxLayoutComponent } from './chatbox-layout/chatbox-layout.component';
import { MainChatboxComponent } from './main-chatbox/main-chatbox.component';
import { NzListModule } from 'ng-zorro-antd/list';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PhoneNumberPipe } from '../utilities/pipes/phone-number.pipe';
import { ReactiveFormsModule } from '@angular/forms';
import { PhoneNumberListComponent } from './phone-number-list/phone-number-list.component';
import { ContactListComponent } from './contact-list/contact-list.component';
import { ConversationBoxComponent } from './conversation-box/conversation-box.component';
import { DateStringFormatPipe } from '../utilities/pipes/date-string-format.pipe';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { GroupConversationBoxComponent } from './group-conversation-box/group-conversation-box.component';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { PhoneNumberFormatNoCodePipe } from '../utilities/pipes/phone-number-format-no-code.pipe';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { AudioRecordingService } from '../services/audio-recording.service';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

@NgModule({
  declarations: [
    ChatboxLayoutComponent,
    MainChatboxComponent,
    PhoneNumberPipe,
    PhoneNumberListComponent,
    ContactListComponent,
    ConversationBoxComponent,
    DateStringFormatPipe,
    GroupConversationBoxComponent,
    PhoneNumberFormatNoCodePipe,
  ],
  imports: [
    CommonModule,
    ChatboxRoutingModule,
    NzListModule,
    FontAwesomeModule,
    NzInputModule,
    NzIconModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    FormsModule,
    NzEmptyModule,
    NzDividerModule,
    NzPopconfirmModule,
    NzToolTipModule,
    NzUploadModule,
    NzModalModule,
    NzImageModule,
    NzProgressModule,
    NzBadgeModule,
  ],
  providers: [AudioRecordingService],
})
export class ChatboxModule {}
