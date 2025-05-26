/*
 streams dialogue from LLM using ActManager (creator of prompts) -> NodeManager (cache of all nodes) -> DialogueNode (messages array ending in 2 player options) -> StreamMessages (messages) -> StreamingClient (chunks)
 maintains a list of remaining dialogue and required actions to be completed before the act is done
 handles both system messages ('katie attacks helen'), llm produced npc/player messages, and player message events ('John: Hello!')
*/

import { IActManager } from './IActManager';
import { INodeManager } from './node/INodeManager';
import { NodeManager } from './node/NodeManager';
import { DialogueNode } from './node/DialogueNode';
import { SystemMessages } from './SystemMessages';
import { IAct } from '../../models/Act';
import { ChatMsg } from '../../models/ChatMsg';
import { GameState } from './../GameState';
import { PromptBuilder } from './PromptBuilder';

export class ActManagerWithNodes implements IActManager {

  // callbacks
  public onActCompleted: Array<() => void> = []; // fires when the act is completed

  // sub-classes
  private nodeManager: INodeManager;
  private promptBuilder: PromptBuilder;

  // requirements to complete the act
  private remainingMessages: number = 0;     // need at least this more messages before act is done
  private remainingActions: string[] = [];
  private MESSAGES_PER_ACT: number = 10;
  private currentActMessages: ChatMsg[] = []; // messages that have been sent in the current act, used to build the prompt, cant utilize all messages from other stories or acts because then hashing/caching acts
  private actCompleted: boolean = false; // prevent multiple callbacks from firing
  private lastPlayerMessage: string = "";

  constructor(
    gameState: GameState,
    private playerName: string, 
    private getCharacterNames: () => Promise<string[]>, 
    private debugQueryLog: { value: string },
    act: IAct, 
    private storyName: string, 
    private sendMessageToChatManager: (lastPlayerMessage: string, name: string, message: string, debug?: string, source?: string) => void)
  {
    this.nodeManager = new NodeManager(playerName, getCharacterNames, debugQueryLog);
    this.startAct(act);
    this.promptBuilder = new PromptBuilder(gameState);
  }

  public startAct(act: IAct, playerMessage?: string): void 
  {
    // reset variables (remaining messages and actions)
    this.actCompleted = false;
    this.remainingMessages = (act.length_modifier || 1) * this.MESSAGES_PER_ACT;
    this.currentActMessages = [];
    if (act.actions) 
    {
        this.remainingActions = [...act.actions];
        for (let i = 0; i < this.remainingActions.length; i++)  this.remainingActions[i] = SystemMessages.formatSystemMessage(this.remainingActions[i], this.playerName);  // formats "Mallory gives the Player a Flower" to "Mallory gives Anna Flower"
    }

    // start a stream via handlePlayerMessage() -> ProduceNewDialogue() -> nodeManager.streamFromNode()
    if(playerMessage) this.handlePlayerMessage(playerMessage);
    else console.log(`[ActManager startAct] Awaiting player message before producing dialogue.  Act initiated with ${this.remainingMessages} messages and ${this.remainingActions.length} actions remaining.`);
  }

  // incoming system message: check required actions
  async handleSystemMessage(systemMessageStr: string): Promise<void> {

    console.log(`[ActManager handleSystemMessage] Handling system message: "${systemMessageStr}" current required actions: ${this.remainingActions}`);

    // remove any pendingActions that match the systemMessageStr
    this.removeRequiredAction(systemMessageStr);
  }

  async handlePlayerMessage(playerMessage: string): Promise<void> {
    console.log(`[ActManager handlePlayerMessage] Responding to message: "${playerMessage}"`);
    
    // the player has chosen a message
    this.lastPlayerMessage = playerMessage;
    this.currentActMessages.push(new ChatMsg(this.playerName, playerMessage));

    // start new dialogue stream via produceNewDialogue() -> nodeManager.streamFromNode()
    await this.produceNewDialogue();

    // Check if the act should be completed
    if (this.remainingMessages <= 0 && this.remainingActions.length === 0) {
      console.log(`[ActManager handlePlayerMessage] Act completed. Notifying callbacks.`);
      this.ActCompleted();
    }
  }

  private async produceNewDialogue(): Promise<void> {
    console.log(`[ActManager produceNewDialogue] Generating ${this.remainingMessages} messages of dialogue`);

    let prompt = await this.produceNewPrompt();

    this.nodeManager.streamFromNode(prompt, this.storyName, this.handleStreamedMessage.bind(this), await this.getCharacterNames());
  }
  
  // Send the message to the chat
  private handleStreamedMessage(message: ChatMsg): void 
  {
    if(message.name.toLowerCase() == "system") message.message = SystemMessages.formatSystemMessage(message.message, this.playerName);
    else this.remainingMessages--; // non-system messages count toward the remainingMessagesAct

    if(message.name.toLowerCase() !== this.playerName.toLowerCase()) this.currentActMessages.push(message); // non-player messages (see handlePlayerMesage for player messages)
    
    this.sendMessageToChatManager(this.lastPlayerMessage, message.name, message.message, this.debugQueryLog.value, "ActManagerWithNodes");
    
    if (this.remainingMessages <= 0 && this.remainingActions.length === 0)  this.ActCompleted();
  }

  lengthenAct(amount: number): void 
  {
    this.remainingMessages += amount;
  }
  
  private ActCompleted(): void {
    if(this.actCompleted) return;
    
    this.actCompleted = true;
    for (const callback of this.onActCompleted) callback();
  }

  removeRequiredAction(systemMessageStr: string): void {
    console.log(`[ActManager removeRequiredAction] Removing system message from required actions: "${systemMessageStr}".  Current required actions: "${this.remainingActions}"`);

    const index = this.remainingActions.findIndex(action => {
      action = SystemMessages.formatSystemMessage(action, this.playerName);
      return action.toLowerCase().trim() === systemMessageStr.toLowerCase().trim();
    });
    if (index >= 0) this.remainingActions.splice(index, 1);
  }

  private async produceNewPrompt(): Promise<string>
  {
      // a prompt is made of:
      // introduction
      // settings, story, lore, locations, player, characters
      // instructions, special instructions, and recent messages
      let prompt = this.promptBuilder.buildDialoguePrompt(this.remainingMessages, this.remainingActions, this.playerName, await this.getCharacterNames(), this.currentActMessages);
      return prompt;
  }
}