import { IAct } from "./../../models/Act";

export interface IActManager {
  
  // start a new act by resetting variables
  startAct(act: IAct): void;
  
  // Handle a player message, possibly advancing the act or at least producing new dialogue
  handlePlayerMessage(playerMessage: string): Promise<void>;

  // Handle a system message, removing the action from the remaining actions list
  handleSystemMessage(systemMessageStr: string): void;
  
  // Register a callback to be notified when the act is complete
  onActCompleted: Array<() => void>;

  // allow outside classes to lengthen the act, for instance, when there are interruptions (messages the player never received but were marked by actmanager off remainingdialogue)
  lengthenAct(amount: number): void;

  // remove a system message from required list
  removeRequiredAction(systemMessageStr: string): void;
}