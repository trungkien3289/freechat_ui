import { ConversationItemType } from '../models/contact-message.model';
import {
  PhoneComunication,
  PhoneComunicationType,
} from '../models/phone-comunication.model';

export class ChatBoxUtils {
  public static getMessageItemType(message: PhoneComunication) {
    if (message.type == PhoneComunicationType.MESSAGE) {
      if (message.media?.image) {
        return ConversationItemType.IMAGE;
      }

      if (message.media?.audio) {
        return ConversationItemType.AUDIO;
      }

      return ConversationItemType.MESSAGE;
    } else {
      return ConversationItemType.MESSAGE;
    }
  }

  public static replaceSpecialCharactersInMessage(text: string) {
    let updatedText = text.replace(/(https?:\/\/)(\S+)/g, '$1 $2');
    updatedText = updatedText.replace(/\$/g, ' $');

    return updatedText;
  }
}
