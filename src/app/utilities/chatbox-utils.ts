import { ConversationItemType } from '../models/contact-message.model';
import {
  PhoneComunication,
  PhoneComunicationType,
} from '../models/phone-comunication.model';

export class ChatBoxUtils {
  public static getMessageItemType(message: PhoneComunication) {
    switch (message.message_type) {
      case PhoneComunicationType.MESSAGE: {
        return ConversationItemType.MESSAGE;
      }
      case PhoneComunicationType.IMAGE: {
        return ConversationItemType.IMAGE;
      }
      default: {
        return ConversationItemType.MESSAGE;
      }
    }
  }

  public static replaceSpecialCharactersInMessage(text: string) {
    let updatedText = text.replace(/(https?:\/\/)(\S+)/g, '$1 $2');
    updatedText = updatedText.replace(/\$/g, ' $');

    return updatedText;
  }

  public static isContainLink(text: string) {
    return text.match(/(https?:\/\/)(\S+)/g);
  }
}
