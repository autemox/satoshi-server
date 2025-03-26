This is the server that works with satoshi-client to load ai created spritesheets into unity and you can walk around in unity.

You cannot yet prompt the ai from Unity.  Once you set up your .ENV API key, use Main.ts to generate new spritesheets like below:

//this.generateSpritesheet("chicken");


--------------------------
To-Do: Finish Setting up to AWS
--------------------------

1. SSH: Create project folders and set up to receive gitpush command

ssh aws
mkdir satoshi-server
mkdir satoshi-server.git                  // bare directory isolates version control from live environment
cd satoshi-server.git
git init --bare

nano hooks/post-receive               // this is how the repo will deploy files to website

    // copy and paste the below for TS projects (JS will need a different third line):

    #!/bin/sh
    GIT_WORK_TREE=/home/ubuntu/satoshi-server git checkout -f main
    pm2 restart /home/ubuntu/satoshi-server/3016-satoshi-server.ts --interpreter="ts-node"
    
chmod +x hooks/post-receive           // makes hook executable

2. TERMINAL: Set up 'gitpush' command on local computer

How to set up 'git pushall' from terminal:
git remote add lightsail ssh://ubuntu@44.239.156.31/home/ubuntu/satoshi-server.git 
git config --global core.sshCommand "ssh -i ~/.ssh/botswana_lightsail_keypair.pem"
git remote add github https://github.com/autemox/satoshi-server.git  
git config --global alias.pushall '!git push github main && git push lightsail main && codemapper .'
git pushall

3. Transfer over .env Variables

Typically I use lysle.net:1000 to transfer them via virtualmin file manager

4. SSH: Inform pm2 about your new project

cd satoshi-server                                            // from ubuntu folder
npm install
pm2 start 3016-satoshi-server.ts --interpreter="ts-node"     // for ts
pm2 save
pm2 list                                                 // make sure it successfully is running




# Introduction to Unity's Netcode for GameObjects (NGO) framework

Unity's Netcode for GameObjects (NGO) is a high-level networking library that makes it easier to develop multiplayer games by extending `NetworkBehaviour` instead of `MonoBehaviour`. It includes integrated scene management to ensure all connected clients are synchronized.

## The Server

The server can be run as a dedicated server in a headless version of Unity, which runs without graphics. Other options include Host-Client mode and Peer-to-Peer with Relay.

### Dedicated Server
A dedicated server is an authoritative instance of the game running headless, making it efficient and secure. Clients connect to it for authoritative game state updates.

## Decorating Variables and Functions

You can decorate variables and functions for syncing data and calling server-client functions.

### [SyncVar] vs NetworkVariable<float>

- `[SyncVar]` is an older way to synchronize variables between server and clients. It works only with `Mirror`, not NGO.
- `NetworkVariable<float>` is a modern way in NGO to synchronize float values between server and clients.

### [ServerRpc]

Used to call functions on the server from a client. The object being called must be owned by the client.

Example:
```csharp
[ServerRpc]
void MoveServerRpc(Vector2 newPos)
{
    position.Value = newPos;
}
```

### [ClientRpc]

Used to call functions on clients from the server.

Example:
```csharp
[ClientRpc]
void NotifyClientRpc(string message)
{
    Debug.Log("Message from server: " + message);
}
```

## NetworkVariables

NetworkVariables are synchronized between the server and all clients. They have various properties:

- `OnValueChanged`: Event triggered when the value changes.
- `Value`: Gets or sets the variable’s value.
- `WritePerm`: Sets who can write (`Owner`, `Server`, or `Everyone`).
- `CanClientWrite`: Checks if the client has write permissions.
- `CanClientRead`: Checks if the client has read permissions.

### How to Set Write Permissions

Example:
```csharp
public NetworkVariable<float> health = new NetworkVariable<float>(100f, NetworkVariableWritePermission.Server);
```

## IsOwner and IsServer

- `IsOwner`: Checks if the current client owns the object.
- `IsServer`: Checks if the script is running on the server instance.

Use these checks to make sure actions are only taken by the appropriate authority.

## Understanding Frequency of Packets

Every time a `[ServerRpc]` function is called, it triggers a packet to be sent. Avoid calling them every `Update()` to reduce network traffic.

## NetworkTickSystem

The `NetworkTickSystem` is used to control the frequency of network updates. It helps regulate how often packets are sent, preventing unnecessary traffic.

## Batching of RPCs

Unity's NGO automatically batches multiple `[ServerRpc]` and `[ClientRpc]` calls made within the same frame, combining them into one network packet. This helps reduce network congestion and increases efficiency.

## Spawning a Player

To spawn a player object and associate it with a client, use `SpawnAsPlayerObject()`.

Example:
```csharp
public void SpawnPlayer(ulong clientId)
{
    var player = Instantiate(playerPrefab).GetComponent<Player>();
    player.NetworkObject.SpawnAsPlayerObject(clientId);
}
```

## Handling Client Connections and Disconnections

Unity NGO provides callbacks for when clients connect and disconnect:
- `OnClientConnectedCallback`: Triggered when a client connects.
- `OnClientDisconnectCallback`: Triggered when a client disconnects.

Example:
```csharp
NetworkManager.Singleton.OnClientConnectedCallback += (clientId) => 
{
    Debug.Log("Client connected: " + clientId);
};
NetworkManager.Singleton.OnClientDisconnectCallback += (clientId) => 
{
    Debug.Log("Client disconnected: " + clientId);
};
```

## Managing Client Data

To store additional information (like player names), use a server-side dictionary:
```csharp
private Dictionary<ulong, string> clientNames = new Dictionary<ulong, string>();
```

To update a client’s name:
```csharp
[ServerRpc]
void UpdateNameServerRpc(string name, ServerRpcParams rpcParams = default)
{
    ulong clientId = rpcParams.Receive.SenderClientId;
    clientNames[clientId] = name;
}
```

## Spawning AI Objects

AI objects are spawned by the server and made visible to all clients using:
```csharp
ai.NetworkObject.Spawn();
```

Clients don’t need to add AI to their lists since they don’t manage AI movement or logic.

## Ownership and Control

Ownership in NGO means the client can update or control an object. Use:
- `ChangeOwnership(clientId)`: Transfer ownership to another client.
- `IsOwner`: Check if the current client owns the object.
- `OwnerClientId`: Get the ID of the current owner.

## Handling Client Input

Clients send their input to the server using a `[ServerRpc]`, and the server then updates the authoritative state.

Example:
```csharp
[ServerRpc]
void MoveServerRpc(Vector2 newPos)
{
    position.Value = newPos;
}
```

## Conclusion

Unity NGO provides powerful networking features for multiplayer games, but careful handling of packet frequency and ownership is essential to maintain performance and consistency.
