/*
 streams dialogue from LLM using ActManager (dialogue sequences) -> StreamMessages (messages) -> StreamingClient (chunks)
 maintains a list of required actions to be completed before the act is done
 handles both system messages ('katie attacks helen') and player message events ('John: Hello!')

 generates dialogue for npcs and the player, giving the player 2 options to choose from
 utilizes NodeCreator to save all generations using a -hash of the prompt- to be used later
*/

import { IActManager } from './IActManager';
import { INodeManager } from './node/INodeManager';
import { NodeManager } from './node/NodeManager';
import { DialogueNode } from './node/DialogueNode';
import { SystemMessages } from './SystemMessages';
import { IAct } from '../../models/Act';
import { ChatMsg } from '../../models/ChatMsg';

export class ActManagerWithNodes implements IActManager {

  private playerName: string;
  private storyName: string;

  // callbacks
  private actCompletedCallbacks: Array<() => void> = [];
  private sendMessageToChatManager: (message: ChatMsg|null, name: string, messageText: string, storyName?: string, debug?: string, source?: string) => void;
  
  private nodeManager: INodeManager;

  // DeepSeek Message Streaming
  private isGeneratingDialogue: boolean = false; // whether StreamMessages is currently generating dialogue

  // requirements to complete the act
  private remainingMessagesAct: number = 0;     // need at least this more messages before act is done
  private remainingActions: string[] = [];
  private MESSAGES_PER_ACT: number = 10;

  // player message generations
  private playerMessageGenerated: boolean = false; // whether the player message has been generated yet (messages before this get sent to player)
  private node: DialogueNode|null = null; // the current node we are generating dialogue for
  private prompt: string = ""; // save the prompt to remember for creating hashes for nodes

  constructor(playerName: string, 
    getCharacterNames: () => Promise<string[]>, 
    debugQueryLog: { value: string }, act: IAct, 
    storyName: string, 
    sendMessageToChatManager: (message: ChatMsg|null, name: string, messageText: string, storyName?: string, debug?: string, source?: string) => void)
  {
    this.playerName = playerName;
    this.storyName = storyName;
    this.sendMessageToChatManager = sendMessageToChatManager;

    // initiate helper classes
    this.nodeManager = new NodeManager(playerName, getCharacterNames, debugQueryLog, this.handleStreamedMessage.bind(this));

    // start the act provided
    this.startAct(act);
  }

  public startAct(act: IAct, playerMessage?: string): void 
  {
    // reset variables (remaining messages and actions)
    this.remainingMessagesAct = (act.length_modifier || 1) * this.MESSAGES_PER_ACT;
    if (act.actions) 
    {
        this.remainingActions = [...act.actions];
        for (let i = 0; i < this.remainingActions.length; i++)  this.remainingActions[i] = SystemMessages.formatSystemMessage(this.remainingActions[i], this.playerName);  // formats "Mallory gives the Player a Flower" to "Mallory gives Anna Flower"
    }

    // start a stream via handlePlayerMessage() -> ProduceNewDialogue()
    if(playerMessage) this.handlePlayerMessage(playerMessage);
    else console.log(`[ActManager startAct] Awaiting player message before producing dialogue.  Act initiated with ${this.remainingMessagesAct} messages and ${this.remainingActions.length} actions remaining.`);
  }

  // incoming system message: check required actions
  async handleSystemMessage(systemMessageStr: string): Promise<void> {

    console.log(`[ActManager handleSystemMessage] Handling system message: "${systemMessageStr}" current required actions: ${this.remainingActions}`);

    // remove any pendingActions that match the systemMessageStr
    this.removeRequiredAction(systemMessageStr);
  }

  async handlePlayerMessage(playerMessage: string): Promise<void> {

    console.log(`[ActManager handlePlayerMessage] Responding to message: "${playerMessage}"`);
    
    // start new dialogue stream
    await this.produceNewDialogue();

    // Check if the act should be completed
    if (this.remainingMessagesAct <= 0 && this.remainingActions.length === 0) {
      console.log(`[ActManager handlePlayerMessage] Act completed. Notifying callbacks.`);
      this.notifyActCompleted();
    }
  }

  private async produceNewDialogue(): Promise<void> {
    console.log(`[ActManager produceNewDialogue] Generating ${this.remainingMessagesAct} messages of dialogue`);

    this.prompt = await this.produceNewPrompt();
    this.nodeManager.streamFromNode(this.prompt, this.storyName, this.handleStreamedMessage.bind(this));
  }

  private async produceNewPrompt(): Promise<string>
  {
      // mark we are generating dialogue
      this.isGeneratingDialogue = true;
      
      // Get relevant data for prompt creation
      const characters: ICharacter[] = await this.gameState.characterManager.getCharacters();
      const player: ICharacter = await this.gameState.getPlayer();
      const recentMessages: ChatMsg[] = this.gameState.chatManager.getMessages(10);
      const conversationStr = ChatManager.messagesToString(recentMessages);
      const story: IStory|undefined = await this.storyManager.getStory();
      const station: IStation = await this.gameState.stationManager.getStation();
      
      // Create a prompt for the LLM using BoChatQuery.getBaseQuery()
      let query = "You are an expert at writing fun dialogue.\n";
      
      query += this.gameState.getGame() === "bo" ? 
        await BoChatQuery.getBaseQuery(this.main, this.gameState, story, characters, player, 100, station) :
        await SmsChatQuery.getBaseQuery(this.main, this.gameState, station, characters, player);

      // Add specific instructions for dialogue generation
      query += "\n-INSTRUCTIONS-\n";
      query += `Generate ${this.remainingMessagesAct} more lines that continue the recent dialogue ${this.gameState.getGame() === "bo" ? " in the style of J.K. Rowling" : ""}\n`;
      query += `The player is part of the story and just wrote: "${recentMessages[recentMessages.length-1].message}"\n`;
      query += `Format each message as "Character: Message" on its own line.`;

      query += `\nWrite dialogue first from one of these characters: ${characters.map(c => c.name).join(', ')}.  The player, ${player.name}, should speak occassionally.\n`;

      if(this.remainingActions.length > 0) {
        query += "\n-SPECIAL SYSTEM MESSAGE INSTRUCTIONS-\n";
        query += "Add ONE and only ONE system message early in the conversation, after the appropriate dialogue has been spoken: System: "+this.remainingActions[0]+"\n";
        query += "Do not have the 'System' character say anything else except for this.\n";
      }

      query += "\n-RECENT DIALOGUE-\n";
      query += conversationStr+"\n"; // query must end with conversationStr so additional messages can be added or removed from it for hashing

      return query;
  }
  
  // Send the message to the chat
  private handleStreamedMessage(message: ChatMsg): void 
  {

    if(this.remainingMessagesAct > 0 || this.remainingActions.length === 0) 
    {
      if(message.name.toLowerCase() == "system") message.message = SystemMessages.formatSystemMessage(message.message, this.playerName); // correct formatting because llm makes mistakes
      else this.remainingMessagesAct--; // tracks messages remaining in entire act
      
      // if a player message has not yet been generated, stream it to the player
      if(!this.playerMessageGenerated)
      {
        this.sendMessageToChatManager(null, message.name, message.message, undefined, `streamed message from ${message.name}, ${this.remainingMessagesAct} messages and ${this.remainingActions.length} actions remain before next act`, "ActManager");
      }

      
        // start a new node for future messages
        this.node = this.nodeManager.createNode(this.prompt+""+message.name+": "+message.message+"\n"); // careful to maintain same format as generated by ChatManager.messagesToString()
      }
      else
      {
        // add the message to the node to be saved for later use
        this.node.addMessage(message);
      }
    }
    else console.log(`[ActManager handleStreamedMessage] Ignoring Streamed message: ${message.name}: ${message.message} because remainingMessages is 0`);
    
    // Check if we're done generating the requested messages
    if (this.remainingMessagesAct <= 0 && this.remainingActions.length === 0) {
      console.log(`[ActManager handleStreamedMessage] Act completed. Notifying callbacks.`);
      this.notifyActCompleted();
    }
  }

  lengthenAct(amount: number): void 
  {
    this.remainingMessagesAct += amount;
  }
  
  onActCompleted(callback: () => void): void {
    this.actCompletedCallbacks.push(callback);
  }

  private notifyActCompleted(): void {
    for (const callback of this.actCompletedCallbacks) {
      callback();
    }
  }

  removeRequiredAction(systemMessageStr: string): void {
    console.log(`[ActManager removeRequiredAction] Removing system message from required actions: "${systemMessageStr}".  Current required actions: "${this.remainingActions}"`);

    const index = this.remainingActions.findIndex(action => {
      action = SystemMessageHandler.formatSystemMessage(action, this.gameState.getPlayerName());
      return action.toLowerCase().trim() === systemMessageStr.toLowerCase().trim();
    });
    if (index >= 0) this.remainingActions.splice(index, 1);
  }
}