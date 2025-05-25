/*
 helper class to format system messages
*/

export class SystemMessages {
    
    public static formatSystemMessage(systemMessageStr: string, playerName: string): string {

        // remove all punctuation
        systemMessageStr = systemMessageStr.replace(/[^a-zA-Z0-9 ]/g, " ");

        // remove common words like 'a' 'the' etc
        systemMessageStr = systemMessageStr.replace(/ the /gi, " ").replace(/ a /gi, " ");
        systemMessageStr = systemMessageStr.replace(/player/gi, playerName);

        // if [character1] gives [item] to [character2], change wording to standard, which is: '[character1] gives [character2] [item]'
        const match = systemMessageStr.match(/(\w+) gives (.*) to (\w+)/i);
        if (match) systemMessageStr = `${match[1]} gives ${match[3]} ${match[2]}`;

        return systemMessageStr;
    }
}