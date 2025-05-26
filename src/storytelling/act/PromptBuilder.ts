import { GameState } from './../GameState';
import { ChatMsg } from '../../models/ChatMsg';

export class PromptBuilder {
    constructor(private gameState: GameState) {}

    public async buildDialoguePrompt(
        remainingMessages: number, 
        remainingActions: string[], 
        playerName: string,
        characterNames: string[],
        messages: ChatMsg[],
    ): Promise<string> {

        // introduction
        let query = "";
        query +="You are an expert young adult fiction dialogue writer in the style of J.K. Rowling.  You will continue the following conversation by adding dialogue to it that reflects each characters accent and personality.\n";

        // baseprompt includes: settings, story, lore, locations, player, characters
        query += await PromptBuilder.basePrompt(this.gameState, characterNames);
    
        // instructions
        query += "\n-INSTRUCTIONS-\n";
        query += `Continue the conversation with ${remainingMessages} more lines of dialogue with the Name: Content format.\n`;
        query += `Character ${playerName} should NOT speak first.\n`;

        if(remainingActions.length > 0) {
            query += "\n-SPECIAL SYSTEM MESSAGE INSTRUCTIONS-\n";
            query += "Add these and ONLY THESE system messages in the conversation, after the appropriate dialogue has been spoken:\n";
            query += remainingActions.map(action => "System: "+action).join("\n")+"\n";
            query += "Do not have the 'System' character say anything else except for this.\n";
        }
        
        // recent messages
        query += "\n-CONVERSATION SO FAR-\n";
        query += characterNames[0] + ": Hello\n";
        query += ChatMsg.messagesToString(messages);

        // change query to harry potter terminology, if needed
        query = ChatMsg.convertHarryPotter(query, true);
        
        return query;
    }

  static async basePrompt(gameState: GameState, characterNames: string[], tokenAllowanceRating=100 /*0-100, 1 is very restrictive, 100 is no restrictions*/): Promise<string> {

    let query = "";

    // get station, player, characters, story, allStationNames out from the game state
    const { station, player, characters, story, allStationNames } = gameState;

    // SETTING
    if(station && player) {
      query += "\n-SETTING-\n";
      query += "" + characters.map(character => character.name).join(", ") + ", and " + player.name + " (the player) are in " + station.name + ", " + station.description + ", alone.  They are dramatic teenagers and LOVE inappropriate and dirty talk!\n";
    }
    
    // STORY
    let currentActDesc;
    if(story && tokenAllowanceRating>15) {
      currentActDesc = story.acts[story.currentAct].description;
      let previousActsCombinedDesc = story.acts.slice(0, story.currentAct).map(act => act.description).join('. ');
      query += "\n-STORY: " + story.name.toUpperCase() + "-\n";
      if (previousActsCombinedDesc != '') query += "Previously Happened (the player knows about this): " + previousActsCombinedDesc+"\n";
      query += "Current Act (do not reveal this to the player): " + currentActDesc + ".\n";
    }

    // LORE
    query += "\n-ABOUT THE WORLD-\n";
    query += "This takes place in Harry Potter's world, but during mideval times in a town called Eldertree.\n";
    if(tokenAllowanceRating>25) {
      query += "Player Interaction: All NPCs can talk, be emotional and dramatic, and chit chat. NPCs LOVE drama, rumors, pranks, and dirty talk. NPCs like to attack (duel) each other or with the player.\n";
    }

    // LOCATIONS
    if(tokenAllowanceRating>20) {
      query += "\n-WORLD LOCATIONS-\n";
      query += "Players and characters can ONLY visit these locations:\n";
      query += allStationNames
        .filter((Station: any) => Station.name != "Characters" && Station.name != "Creator")
        .map((Station: any) => Station.name)
        .join(', ') + ".\n"; // list of legit bo station names
    }

    // PLAYER
    if(player) {
      query += "\n-ABOUT THE PLAYER: " + player.name.toUpperCase() + "-\n";
      if(player.age || player.gender || player.bo_house || player.bo_year) query += `A ${player.age ? player.age + ` year old ` : ``} ${player.gender ? player.gender : `person`}${ player.bo_house?` who belongs to House ${player.bo_house}`:``} \n`;
      query += "Appearance: " + player.appearance + ".\n";
    }

    // CHARACTERS
    for (const character of characters) {
      if(character.isPlayer || character.name.toLowerCase() == "system") continue;
      query += await PromptBuilder.baseCharacterInfo(gameState, character);
    };
    return query;
  }

  static async baseCharacterInfo(gameState: GameState, character: any /*type later*/): Promise<string> {
    
    let query ="\n-ABOUT THE CHARACTER: " + character.name.toUpperCase() + "\n";
    if(character.age || character.gender || character.bo_house || character.bo_year) query += `A ${character.age ? character.age + ` year old ` : ``} ${character.gender ? character.gender : `person`}${character.bo_year ? ` in year ${character.bo_year} `:``}${ character.bo_house?` who belongs to House ${character.bo_house}`:``} \n`;
    if(character.appearance != undefined && character.appearance !="") query += "Appearance: " + character.appearance + "\n";
    if(character.personality != undefined && character.personality !="") query += "Personality: " + character.personality + "\n";
    if(character.description != undefined && character.description !="") query += "Description: " + character.description + "\n";
    if(character.accent != undefined && character.accent != "") query += "Accent: " + character.accent + "\n";
    
    // add this back in later
    /*if (character.relationships.length > 0) {
      query += "Relationships: " + 
      (await Promise.all(character.relationships.map(async r => { // Add 'async' and 'await' here
        return `${r.name}: ${await RelationshipChecker.relationshipTextFromNames(gameState, character.name, r.name)}`;
      }))).join(". ") + ".\n";
    }
    
    if (character.secrets && character.secrets.length>0) query += "Secrets: " + character.secrets.map(s => `${s.name}: ${s.value}`).join(". ") + ".\n";
    if (character.memories && character.memories.length > 0) {
      const date = moment(character.memories[0].value).format('MM/DD/YY');
      let memoriesArr = gameState.memoryManager.getRelatedMemoriesFromCache(character.name);
      if(memoriesArr && memoriesArr.length>0) query += "Memories: "+character.name+" has learned:\n" + memoriesArr.map(m => m).join(", ") + "\n";
    }
    if (character.story_items && character.story_items.length > 0) query += "Items: " + character.story_items.join(", ") + ".\n";
    */

    return query;
  }
}