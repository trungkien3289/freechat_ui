import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { EnvService } from './env.service';
import { GroupContactCacheService } from './group-contact-cache.service';
import { firstValueFrom } from 'rxjs';
import { ConversationItemType } from '../models/contact-message.model';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private apiUrl = ``;

  constructor(
    private http: HttpClient,
    public jwtHelper: JwtHelperService,
    private _EnvService: EnvService,
    private _GroupContactCacheService: GroupContactCacheService
  ) {
    this.apiUrl = _EnvService.apiUrl;
  }

  upload = async (
    file: File,
    fileName: string,
    itemType: ConversationItemType
  ): Promise<any> => {
    try {
      // Create the form data for the file upload
      const formData = new FormData();
      // formData.append('file', (item as any).file as Blob);
      formData.append('file', file as any, fileName); // Append file to form data
      formData.append(
        'type',
        itemType == ConversationItemType.AUDIO ? 'stream' : 'images/v1'
      ); // Append file to form data

      const res = await firstValueFrom(
        this.http.post(`${this.apiUrl}/api/pinger/attachments/upload`, formData)
      );

      return res;
    } catch (ex: any) {
      throw 'Error uploading file';
    }
  };
}