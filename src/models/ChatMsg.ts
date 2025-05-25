export class ChatMsg {

    name: string;
    message: string;

    constructor(name: string, message: string) {
        this.name = name;
        this.message = message;
    }

    // <summary>removes any messages from "System" character, such as emotes and attacks</summary>
    public static removeSystemMessages(messages: ChatMsg[], removeEmotes: boolean, removeAttacks: boolean): ChatMsg[] 
    {
      return messages.filter((message) => {
        if (message.name === "System") {
          const words = message.message.split(" ");
          const isAttack = words.length>1 && words[1] === "attacks";
          if (isAttack && removeAttacks) return false; // its an attack
          if (!isAttack && removeEmotes) return false; // its a emote 
        }
        return true;
      });
    }

    static messagesToString(messages: ChatMsg[]): string {
      
      return messages.map(msg => `${msg.name}: ${msg.message}`).join('\n');
    }

    // <summary>Makes long messages break into multiple shorter ones</summary>
    public static breakMessagesBySentences(messages: ChatMsg[], maxChar: number = 2000): ChatMsg[]
    {
      return messages.flatMap(({ name, message }) => {
          const sentences = message.split(/(?<=[.!?])\s+/).filter(Boolean);
          const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
          const idealMessageCount = Math.ceil(totalChars / maxChar);
          const idealMessageLength = Math.floor(totalChars / idealMessageCount);
  
          const result: ChatMsg[] = [];
          let currentMessage = "";
          let currentLength = 0;
  
          for (const sentence of sentences) {
              if (currentLength + sentence.length > idealMessageLength && 
                  (result.length < idealMessageCount - 1 || currentLength + sentence.length > maxChar)) {
                  result.push({ name, message: currentMessage.trim() });
                  currentMessage = "";
                  currentLength = 0;
              }
              currentMessage += sentence + " ";
              currentLength += sentence.length + 1; // +1 for the space
          }
  
          if (currentMessage.length > 0) {
              result.push({ name, message: currentMessage.trim() });
          }
  
          return result;
      });
    }

    // <summary>returns the message array but with older messages removed</summary>
    static spliceMessages(messages: ChatMsg[], playerName: string, numberOfPlayerMessagesToInclude: number): ChatMsg[] 
    {  
      console.log(`[DEBUG] spliceMessages called with ${messages.length} messages, playerName=${playerName}, numberOfPlayerMessagesToInclude=${numberOfPlayerMessagesToInclude}`);
      console.log(`[DEBUG] messages contain player messages: ${messages.some(message => message.name === playerName)}`);
      
      // If there are no messages from the player, return all messages
      if (!messages.some(message => message.name === playerName)) return messages;
  
      // Reverse the array to start checking from the most recent message
      let reversedMessages = messages.slice().reverse();
      let playerMessageCount = 0;
      let spliceIndex = reversedMessages.length;  // Start with the full length as default
  
      // Iterate through the reversed array
      for (let i = 0; i < reversedMessages.length; i++) {
        const message = reversedMessages[i];
        
        // Check if the message is from the specified player
        if (message.name === playerName) {
          playerMessageCount++;
          
          // When the required number of player messages is found, mark the splice index
          if (playerMessageCount === numberOfPlayerMessagesToInclude) {
            spliceIndex = i + 1;
            break;
          }
        }
      }
  
      // Splice the reversed array up to the splice index and reverse it back
      let result = reversedMessages.slice(0, spliceIndex).reverse();
      console.log(`[DEBUG] spliceMessages returning ${result.length} messages`);
      return result;
    }

    static trimMessages(msgObjArr: ChatMsg[]): ChatMsg[] {

      msgObjArr = msgObjArr.filter(obj => obj.message !== ""); // Remove empty string messages
      msgObjArr = msgObjArr.filter(obj => !obj.message.match(/^[0-9]\.?$/)); // remove messages without letters in them
      msgObjArr = msgObjArr.map(obj => ({ ...obj, message: obj.message.replace(/(^|[^"])("|")([^"]|$)/g, '$1$3')})); // Remove single " while keeping double ""
      return msgObjArr;
    }

    static realMessageCount(msgObjArr: ChatMsg[]): number {

      msgObjArr = ChatMsg.filterAllNonSpeechMessages(msgObjArr);
      msgObjArr = ChatMsg.trimMessages(msgObjArr);
      return msgObjArr.length;
    }

    static filterAllNonSpeechMessages(messages: ChatMsg[]): ChatMsg[] {
      return messages.map(message => ({
        ...message,
        message: ChatMsg.filterNonSpeech(message.message) // removes (sigh) and *emotes*
      }));
    }

    // <summary>Filters out non-speech text from a string, such as *smirks* or (laughs) at the start of message content</summary>
    static filterNonSpeech(str: string): string {

      str = str.replace(/\[.*?\]|\(.*?\)|\*.*?\*/g, ''); // Remove text between square brackets, parentheses, and stars
      return str;
    }

    // <summary>removes old messages to keep the total characters within a limit</summary>
    static reduceMessages(messages: ChatMsg[], totalChar: number): ChatMsg[] {
        return messages.reduceRight((acc, msgObj) => {
          if (`${msgObj.name}: ${msgObj.message}`.length <= totalChar) {
            acc.push(msgObj);
          }
          return acc;
        }, [] as ChatMsg[]).reverse();
    }

    // convert chat text (e.g. "Ron: Hello!\nRon: How are you?") to an array of messages
    public static chatTextToMessages(chatText: string, playerName: string, validNames: string[] = [], invalidName: string = 'Invalid', defaultCharacterName:string = ''): ChatMsg[] 
    {
            console.log(`[ChatManager chatTextToMessages] Converting chat text to messages: ${chatText} (valid names: ${validNames.join(', ')})`);
            const allNames = [...validNames, playerName];
          
            // looks for .n Ron: and similar cases and fixes the n to \n
            chatText = chatText.replace(new RegExp(`(?<![a-zA-Z])([!?.]{0,1}N\\s{0,3}[\\\\/]{1}\\s{0,2}|[\\\\/]{1}\\s{0,2}|[!?.]{0,1}N\\s{0,3})(${allNames.join('|')})`, 'gi'), '\n$2');
            
            chatText = chatText
            .replace(new RegExp(`(${allNames.join('|')}):(?=[^\\s])`, 'g'), '$1:\n')
            .replace(new RegExp(`(^|\\s)(${allNames.join('|')}):`, 'g'), '\n$1$2:')
              .replace(/\n\n\n/g, '\n')
              .replace(/\n\n/g, '\n')
              .replace(/\\n/g, '\n')
              .replace(/'\n'/g, '\n')
              .replace(/(^\w|\.\s*\w|!\s*\w|\?\s*\w)/g, letter => letter.toUpperCase())
              .replace(/\b\w+\b/g, match =>
                allNames.includes(match.toLowerCase()) ? match.charAt(0).toUpperCase() + match.slice(1) : match
              )
              .replace(/!N /g, "! ")
              .replace(/\?N /g, "? ");
            
            // fixes ?Name and .Name and !Name to add a \n between
            chatText = chatText.replace(new RegExp(`([!?\\.])(${allNames.join('|')})(?=\\s|$)`, 'g'), '$1\n$2');
            
            const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
            const lines = chatText.split('\n');
            let validLines: ChatMsg[] = [];
            
            let firstLine = true;
            for (const line of lines) {
              const trimmedLine = line.trim();
              const index = trimmedLine.indexOf(': ');
              
              if (index !== -1) { // If the line ends with ":", and there is no message, skip it.
                const message = trimmedLine.substring(index + 2).trim();
                if (message === '') continue; 
              }
              
              if (index === -1) {
                // If it's the first line and doesn't have a character speaking, use the first valid name
                if (firstLine && validNames.length > 0) {
                  validLines.push({ name: validNames[0], message: capitalize(trimmedLine) });
                } else {
                  // For other lines without a character speaking, add the System saying the line
                  validLines.push({ name: defaultCharacterName || "System", message: capitalize(trimmedLine) });
                }
                firstLine = false;
                continue;
              }
              
              let name = trimmedLine.substring(0, index);
              name = name.includes(',') ? name.split(',')[0] : name;
              let message = trimmedLine.substring(index + 2);
              
              let validName = validNames.find(vn => vn.toLowerCase() === name.toLowerCase());
              if(name == "System") validName = "System"; // allow system name
              if (validName) {
                message = message.replace(/(?:^|[\.\?!]\s*)([a-z])/g, (m, p1) => p1.toUpperCase()).replace(/^'+|'+$/g, '');
                message = message.replace(/\b([a-z]+)/g, (m, p1) =>
                  validNames.includes(p1) ? capitalize(p1) : p1
                );
                if (message.startsWith('"') && message.endsWith('"') && message.length >= 2) message = message.substring(1, message.length - 1); // Remove quotes if message starts with " and ends with "
                
                validLines.push({ name: validName, message });
              } else {
                console.error(`[ChatManager chatTextToMessages] Invalid name: ${name} for line ${line}`);
                break; // Stop processing at the first invalid name
              }
              firstLine = false;
            }
            validLines = validLines.filter((msgObj) => msgObj.message.trim() !== ''); // remove empty messages
    
            console.log(`[ChatManager chatTextToMessages] Converted chat text to ${validLines.length} messages.`);
            return validLines;
    }
  }