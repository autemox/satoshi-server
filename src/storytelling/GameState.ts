import { IActManager } from './act/IActManager';

export class GameState {

    // mock objects for now
    public actManager: IActManager;
    public station = {
        name: "The Fountain",
        description: "a fountain central to the town of Ashgrove"
    };
    public player = {
        name: "John",
        age: 16,
        gender: "male",
        bo_house: "Gryffindor",
        bo_year: 6,
        appearance: "tall with messy black hair and green eyes"
    };
    public characters = [
        {
            name: "Mary",
            age: 15,
            gender: "female",
            bo_house: "Ravenclaw",
            bo_year: 5,
            appearance: "petite with curly brown hair",
            personality: "witty and studious",
            description: "a brilliant student who loves books",
            accent: "posh British",
            isPlayer: false
        },
        {
            name: "Ron",
            age: 16,
            gender: "male", 
            bo_house: "Gryffindor",
            bo_year: 6,
            appearance: "tall and lanky with red hair and freckles",
            personality: "loyal but sometimes insecure",
            description: "a brave friend who stands by his companions",
            accent: "working-class British",
            isPlayer: false
        }
    ];
    public story = {
        name: "Ron's Teeth",
        currentAct: 0,
        acts: [
            { characters: ["John", "Mary", "Ron"], description: "Ron mysteriously lost all his teeth and is being made fun of by his friends", length_modifier: 0.5},
            { characters: ["John", "Mary", "Ron"], description: "Mary blames john for jinxing ron, but john denies it.  Ron doesnt believe him and attacks him", actions: ["Ron attacks John"], length_modifier: 0.5 },
            { characters: ["John", "Mary", "Ron"], description: "Mary admits she was lying and it was her that did it.  She gives Ron the antidote and his teeth grow back", length_modifier: 0.5 }
        ]
    };
    public allStationNames = [
        { name: "The Fountain" },
        { name: "Blacksmith Shop" },
        { name: "Town Boundary" },
        { name: "Knoll Den" },
    ];

    constructor(actManager: IActManager) {
        this.actManager = actManager;
    }
}